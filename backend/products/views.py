from rest_framework import generics, status, filters, serializers, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, F, Count, Avg, Sum, Value, IntegerField, Case, When
from django.core.files.base import File
import os
from django.utils import timezone
from django.conf import settings
from .models import Product, Category, Color, ProductImage, Subcategory, Favorite, Review, ReviewHelpfulVote
from .serializers import (
    ProductListSerializer, 
    ProductDetailSerializer, 
    ProductCreateUpdateSerializer,
    CategorySerializer,
    SubcategorySerializer,
    ColorSerializer,
    ProductImageSerializer,
    FavoriteSerializer,
    FavoriteCreateSerializer,
    ReviewSerializer
)
from customers.views import IsAdmin

class ColorListCreateView(generics.ListCreateAPIView):
    """
    List all colors or create a new color
    """
    queryset = Color.objects.filter(is_active=True)
    serializer_class = ColorSerializer

    def get_permissions(self):
        # Allow anyone to list colors, only admins can create
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdmin()]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

class ColorDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a color
    """
    queryset = Color.objects.all()
    serializer_class = ColorSerializer

    def get_permissions(self):
        # Allow anyone to retrieve, only admins can update/delete
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdmin()]

class CategoryListCreateView(generics.ListCreateAPIView):
    """
    List all categories or create a new category
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        # Public listing, only admins can create
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdmin()]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a category
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdmin()]

class SubcategoryListCreateView(generics.ListCreateAPIView):
    """
    List all subcategories or create a new subcategory
    """
    queryset = Subcategory.objects.select_related('category').all()
    serializer_class = SubcategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['name', 'description', 'category__name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    filterset_fields = ['category']

    def get_permissions(self):
        # public list, admin create
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdmin()]

class SubcategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a subcategory
    """
    queryset = Subcategory.objects.select_related('category').all()
    serializer_class = SubcategorySerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdmin()]

@api_view(['GET'])
def subcategories_by_category(request, category_id):
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return Response({'error': 'Categoria não encontrada'}, status=status.HTTP_404_NOT_FOUND)
    subs = Subcategory.objects.filter(category=category).order_by('name')
    serializer = SubcategorySerializer(subs, many=True)
    return Response(serializer.data)

class ProductListCreateView(generics.ListCreateAPIView):
    """
    List all products or create a new product
    """
    queryset = Product.objects.select_related('category', 'subcategory').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'brand', 'sku']
    filterset_fields = ['category', 'subcategory', 'status', 'is_featured', 'is_bestseller', 'is_on_sale']
    ordering_fields = ['name', 'price', 'created_at', 'stock_quantity', 'view_count', 'sales_count']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductCreateUpdateSerializer
        return ProductListSerializer

    def get_permissions(self):
        # Allow public listing, require admin to create products
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdmin()]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        # Filter by stock status
        in_stock = self.request.query_params.get('in_stock')
        if in_stock == 'true':
            queryset = queryset.filter(stock_quantity__gt=0)
        elif in_stock == 'false':
            queryset = queryset.filter(stock_quantity=0)
        
        # Filter by low stock
        low_stock = self.request.query_params.get('low_stock')
        if low_stock == 'true':
            queryset = queryset.filter(stock_quantity__lte=F('min_stock_level'))
        
        return queryset

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a product
    """
    queryset = Product.objects.select_related('category').all()
    lookup_field = 'slug'
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count unless it's a preview request
        is_preview = request.query_params.get('preview') in ['1', 'true', 'True']
        if not is_preview:
            instance.increment_view_count()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_permissions(self):
        # Public retrieve, admin required for updates/deletes
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdmin()]

class ProductByIdDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a product by ID (for admin use)
    """
    queryset = Product.objects.select_related('category').all()
    permission_classes = [IsAdmin]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer

@api_view(['POST'])
@permission_classes([IsAdmin])
def duplicate_product(request, pk: int):
    """
    Duplicate a product by ID, copying its fields, colors, and images.
    Returns the newly created product details.
    """
    try:
        original = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Produto não encontrado'}, status=status.HTTP_404_NOT_FOUND)

    # Prepare new product data (exclude autogenerated and counters)
    new_product = Product(
        name=f"{original.name} (Cópia)",
        description=original.description,
        short_description=original.short_description,
        category=original.category,
        subcategory=original.subcategory,
        brand=original.brand,
        price=original.price,
        original_price=original.original_price,
        is_on_sale=original.is_on_sale,
        stock_quantity=original.stock_quantity,
        min_stock_level=original.min_stock_level,
        specifications=original.specifications,
        meta_title=original.meta_title,
        meta_description=original.meta_description,
        status=original.status,
        is_featured=original.is_featured,
        is_bestseller=original.is_bestseller,
        weight=original.weight,
        length=original.length,
        width=original.width,
        height=original.height,
    )

    # Save first to obtain an ID (SKU/slug are auto-generated in save())
    new_product.save()

    # Copy legacy image fields if present
    legacy_image_fields = ['main_image', 'image_2', 'image_3', 'image_4']
    for field_name in legacy_image_fields:
        orig_field = getattr(original, field_name)
        if orig_field:
            try:
                # Use the original file's basename just for extension; upload_to will generate a new unique path
                base_name = os.path.basename(orig_field.name)
                with orig_field.open('rb') as f:
                    getattr(new_product, field_name).save(base_name, File(f), save=True)
            except Exception:
                # If a single image fails to copy, skip it silently
                pass

    # Copy ProductImage records (and files)
    for img in original.images.all().order_by('order', 'created_at'):
        try:
            new_img = ProductImage(
                product=new_product,
                alt_text=img.alt_text,
                is_main=img.is_main,
                order=img.order,
            )
            base_name = os.path.basename(img.image.name)
            with img.image.open('rb') as f:
                new_img.image.save(base_name, File(f), save=True)
        except Exception:
            # Skip problematic images to avoid failing the whole duplication
            continue

    # Copy colors (M2M)
    new_product.colors.set(original.colors.all())

    serializer = ProductDetailSerializer(new_product, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

@api_view(['GET'])
@cache_page(60 * 5)  # Cache for 5 minutes
def featured_products(request):
    """
    Get featured products with caching
    """
    products = Product.objects.filter(
        is_featured=True,
        status='active'
    ).select_related(
        'category',
        'subcategory'
    ).prefetch_related(
        'colors'
    ).only(
        'id', 'name', 'slug', 'price', 'original_price',
        'is_on_sale', 'stock_quantity', 'status', 'main_image',
        'min_stock_level', 'category__name', 'subcategory__name'
    )[:8]
    
    serializer = ProductListSerializer(products, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
def bestseller_products(request):
    """
    Get bestseller products
    """
    products = Product.objects.filter(
        is_bestseller=True
    ).select_related('category').order_by('-sales_count')[:8]
    
    serializer = ProductListSerializer(products, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
def sale_products(request):
    """
    Get products on sale
    """
    products = Product.objects.filter(
        is_on_sale=True, 
        status='active'
    ).select_related('category').order_by('-created_at')[:8]
    
    serializer = ProductListSerializer(products, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
def products_by_category(request, category_id):
    """
    Get products by category
    """
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return Response(
            {'error': 'Categoria não encontrada'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    products = Product.objects.filter(
        category=category, 
        status='active'
    ).select_related('category')
    
    # Apply ordering
    ordering = request.query_params.get('ordering', '-created_at')
    products = products.order_by(ordering)
    
    serializer = ProductListSerializer(products, many=True, context={'request': request})
    return Response({
        'category': CategorySerializer(category).data,
        'products': serializer.data
    })

@api_view(['GET'])
def search_products(request):
    """
    Advanced product search
    """
    try:
        query = request.query_params.get('q', '')
        category_id = request.query_params.get('category')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')

        products = Product.objects.filter(status='active').select_related('category')

        if query:
            products = products.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(brand__icontains=query) |
                Q(category__name__icontains=query)
            )

        if category_id:
            products = products.filter(category_id=category_id)

        if min_price:
            products = products.filter(price__gte=min_price)

        if max_price:
            products = products.filter(price__lte=max_price)

        # Order by relevance (products with query in name first) without raw SQL
        if query:
            products = products.annotate(
                name_match=Case(
                    When(name__icontains=query, then=Value(1)),
                    default=Value(0),
                    output_field=IntegerField(),
                )
            ).order_by('-name_match', '-created_at')
        else:
            products = products.order_by('-created_at')

        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception as e:
        # Fail safe: never 500 on search; provide a structured error
        return Response({
            'error': 'search_failed',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAdmin])
def product_stats(request):
    """
    Get product statistics for admin dashboard
    """
    stats = {
        'total_products': Product.objects.count(),
        'active_products': Product.objects.filter(status='active').count(),
        'inactive_products': Product.objects.filter(status='inactive').count(),
        'out_of_stock_products': Product.objects.filter(stock_quantity=0).count(),
        'low_stock_products': Product.objects.filter(
            stock_quantity__lte=F('min_stock_level'),
            stock_quantity__gt=0
        ).count(),
        'featured_products': Product.objects.filter(is_featured=True).count(),
        'bestsellers': Product.objects.filter(is_bestseller=True).count(),
        'products_on_sale': Product.objects.filter(is_on_sale=True).count(),
        'average_price': Product.objects.filter(status='active').aggregate(
            avg_price=Avg('price')
        )['avg_price'] or 0,
        'total_stock_value': Product.objects.filter(status='active').aggregate(
            total_value=Sum(F('price') * F('stock_quantity'))
        )['total_value'] or 0,
        'categories_count': Category.objects.count(),
    }
    
    return Response(stats)


class ProductImageViewSet(ModelViewSet):
    """
    ViewSet for managing product images
    """
    serializer_class = ProductImageSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter images by product if product_id is provided"""
        queryset = ProductImage.objects.all()
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset.order_by('order', 'created_at')

    def get_permissions(self):
        # Allow public reads, require admin for create/update/delete and bulk operations
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdmin()]
    
    def perform_create(self, serializer):
        """Set the product when creating an image"""
        
        # Try both 'product' and 'product_id' for compatibility
        product_id = self.request.data.get('product') or self.request.data.get('product_id')
        print(f"DEBUG: perform_create - product_id: {product_id}, request.data: {dict(self.request.data)}")
        
        if product_id:
            try:
                from .models import Product
                product = Product.objects.get(id=product_id)
                serializer.save(product=product)
            except Product.DoesNotExist:
                raise serializers.ValidationError({'product': 'Product not found'})
        else:
            raise serializers.ValidationError({'product': 'Product ID is required'})
    
    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        """
        Bulk upload multiple images for a product
        Expects: product_id and multiple image files
        """
        product_id = request.data.get('product_id')
        if not product_id:
            return Response(
                {'error': 'product_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all uploaded files
        uploaded_images = []
        errors = []
        
        # Handle multiple files
        files = request.FILES.getlist('images')
        if not files:
            return Response(
                {'error': 'No images provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        for index, image_file in enumerate(files):
            # Prepare data for each image
            image_data = {
                'product': product.id,
                'image': image_file,
                'alt_text': request.data.get(f'alt_text_{index}', ''),
                'is_main': request.data.get(f'is_main_{index}', 'false').lower() == 'true',
                'order': request.data.get(f'order_{index}', index + 1)
            }
            
            serializer = ProductImageSerializer(data=image_data)
            if serializer.is_valid():
                image_instance = serializer.save()
                uploaded_images.append(ProductImageSerializer(image_instance).data)
            else:
                errors.append({
                    'file_index': index,
                    'filename': image_file.name,
                    'errors': serializer.errors
                })
        
        response_data = {
            'uploaded_images': uploaded_images,
            'total_uploaded': len(uploaded_images),
            'errors': errors
        }
        
        if errors and not uploaded_images:
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(response_data, status=status.HTTP_201_CREATED)


# =====================================================
# FAVORITES VIEWS
# =====================================================

class FavoriteListCreateView(generics.ListCreateAPIView):
    """List or create favorites.
    LIST: If unauthenticated return empty list (200) instead of 403 to simplify frontend handling.
    CREATE: Requires authentication.
    """
    serializer_class = FavoriteSerializer
    # AllowAny so GET returns 200 empty when not authenticated; create() will enforce auth.
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # TEMP DEBUG
        auth_header = self.request.headers.get('Authorization')
        if auth_header:
            print('[Favorites][DEBUG] Authorization header present (truncated):', auth_header[:40])
        else:
            print('[Favorites][DEBUG] No Authorization header')

        if getattr(self.request, 'user', None) and self.request.user.is_authenticated:
            return Favorite.objects.filter(user=self.request.user).select_related('product')
        return Favorite.objects.none()
    
    def create(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = FavoriteCreateSerializer(data=request.data)
        if serializer.is_valid():
            product_id = serializer.validated_data['product_id']
            
            # Check if already favorited
            if Favorite.objects.filter(user=request.user, product_id=product_id).exists():
                return Response(
                    {'error': 'Produto já está nos favoritos'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create favorite
            favorite = Favorite.objects.create(
                user=request.user,
                product_id=product_id
            )
            
            # Return favorite with product details
            response_serializer = FavoriteSerializer(favorite, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FavoriteDetailView(generics.DestroyAPIView):
    """
    Remove a favorite
    """
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Favorite.objects.filter(user=self.request.user)
        return Favorite.objects.none()


@api_view(['POST', 'DELETE'])
@permission_classes([permissions.AllowAny])
def toggle_favorite(request, product_id):
    """
    Toggle favorite status for a product
    POST: Add to favorites
    DELETE: Remove from favorites
    """
    # TEMP DEBUG
    header = request.headers.get('Authorization')
    if header:
        print('[ToggleFavorite][DEBUG] Auth header (truncated):', header[:40])
    else:
        print('[ToggleFavorite][DEBUG] Missing Authorization header')

    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        product = Product.objects.get(id=product_id, status='active')
    except Product.DoesNotExist:
        return Response(
            {'error': 'Produto não encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    user = request.user
    
    favorite = Favorite.objects.filter(user=user, product=product).first()
    
    if request.method == 'POST':
        if favorite:
            return Response(
                {'message': 'Produto já está nos favoritos', 'is_favorite': True}, 
                status=status.HTTP_200_OK
            )
        else:
            Favorite.objects.create(user=user, product=product)
            return Response(
                {'message': 'Produto adicionado aos favoritos', 'is_favorite': True}, 
                status=status.HTTP_201_CREATED
            )
    
    elif request.method == 'DELETE':
        if favorite:
            favorite.delete()
            return Response(
                {'message': 'Produto removido dos favoritos', 'is_favorite': False}, 
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'message': 'Produto não está nos favoritos', 'is_favorite': False}, 
                status=status.HTTP_200_OK
            )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_favorite_status(request, product_id):
    """
    Check if a product is favorited by the user
    """
    if not request.user.is_authenticated:
        return Response({'is_favorite': False})
    
    is_favorite = Favorite.objects.filter(
        user=request.user, 
        product_id=product_id
    ).exists()
    
    return Response({'is_favorite': is_favorite})


# =====================================================
# AUTH DEBUG
# =====================================================
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def auth_ping(request):
    """Return basic auth info for debugging Firebase integration."""
    user = None
    if getattr(request, 'user', None) and request.user.is_authenticated:
        user = {
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_login': request.user.last_login,
        }
    return Response({
        'authenticated': bool(user),
        'user': user,
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def auth_token_payload(request):
    """(DEV ONLY) Return unverified JWT payload from Authorization header for debugging.
    Gate with ENABLE_TOKEN_PAYLOAD_DEBUG env var to avoid accidental exposure.
    Never enable in production environments.
    """
    if os.getenv('ENABLE_TOKEN_PAYLOAD_DEBUG') not in ['1', 'true', 'True']:
        return Response({'error': 'Endpoint disabled'}, status=status.HTTP_403_FORBIDDEN)

    header = request.headers.get('Authorization')
    if not header or not header.startswith('Bearer '):
        return Response({'error': 'Missing Bearer token'}, status=status.HTTP_400_BAD_REQUEST)

    token = header.split(' ')[1].strip()
    parts = token.split('.')
    if len(parts) != 3:
        return Response({'error': 'Malformed JWT'}, status=status.HTTP_400_BAD_REQUEST)
    import base64, json
    try:
        # Add padding then decode
        payload_segment = parts[1] + '==='  # ensure padding
        payload_json = base64.urlsafe_b64decode(payload_segment).decode('utf-8')
        payload = json.loads(payload_json)
    except Exception as e:
        return Response({'error': 'Decode failed', 'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # Redact potentially sensitive fields (like firebase sign-in provider tokens) if present
    redacted = dict(payload)
    for k in list(redacted.keys()):
        if k.lower().endswith('token') or k in ['firebase', 'nonce']:  # optionally redact nested objects
            continue  # keep structure but could also remove; adjust if needed

    return Response({
        'unverified_payload': redacted,
        'uid': payload.get('uid'),
        'email': payload.get('email'),
        'auth_time': payload.get('auth_time'),
        'exp': payload.get('exp'),
        'iat': payload.get('iat'),
        'iss': payload.get('iss'),
        'aud': payload.get('aud'),
    })


class ReviewListCreateView(generics.ListCreateAPIView):
    """
    List approved reviews for a product or create a new review (pending approval)
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_queryset(self):
        product_id = self.kwargs.get('product_id')
        queryset = Review.objects.filter(product_id=product_id).select_related('user').prefetch_related('images')
        # Optional rating filter
        rating = self.request.query_params.get('rating')
        if rating:
            try:
                rating_int = int(rating)
                if 1 <= rating_int <= 5:
                    queryset = queryset.filter(rating=rating_int)
            except ValueError:
                pass
        
        # Staff users can see all reviews in the admin
        if self.request.user.is_staff and self.request.query_params.get('admin'):
            return queryset
            
        # Regular users only see approved reviews
        queryset = queryset.filter(status='approved')
        # Optional filter: with photos
        if self.request.query_params.get('with_photos') in ['1', 'true', 'True']:
            queryset = queryset.filter(images__isnull=False).distinct()
        # Sorting
        sort_by = self.request.query_params.get('sort_by', 'recent')
        if sort_by == 'highest':
            queryset = queryset.order_by('-rating', '-created_at')
        elif sort_by == 'lowest':
            queryset = queryset.order_by('rating', '-created_at')
        elif sort_by == 'helpful':
            queryset = queryset.order_by('-helpful_count', '-created_at')
        else:
            queryset = queryset.order_by('-created_at')
        return queryset

    def list(self, request, *args, **kwargs):
        """Return paginated reviews plus meta stats (distribution, total, average)."""
        product_id = self.kwargs.get('product_id')
        # Compute meta from approved reviews for the product (ignore rating filter)
        base_qs = Review.objects.filter(product_id=product_id, status='approved')
        counts = {i: 0 for i in range(1, 6)}
        # Aggregate counts per rating
        from django.db.models import Count as DJCount
        agg = base_qs.values('rating').annotate(c=DJCount('id'))
        total = 0
        for row in agg:
            r = int(row['rating'])
            c = int(row['c'])
            counts[r] = c
            total += c
        # Average
        avg = base_qs.aggregate(a=Avg('rating')).get('a') or 0

        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            # attach meta
            response.data['meta'] = {
                'counts': counts,
                'total': total,
                'average': round(float(avg), 1) if avg else 0,
            }
            return response
        serializer = self.get_serializer(queryset, many=True)
        data = {
            'results': serializer.data,
            'count': len(serializer.data),
            'next': None,
            'previous': None,
            'meta': {
                'counts': counts,
                'total': total,
                'average': round(float(avg), 1) if avg else 0,
            }
        }
        return Response(data)
    
    def perform_create(self, serializer):
        product_id = self.kwargs.get('product_id')
        product = Product.objects.get(pk=product_id)
        # New reviews start as pending
        serializer.save(
            user=self.request.user,
            product=product,
            status='pending'
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def review_toggle_helpful(request, pk: int):
    """Toggle helpful vote for a review by the authenticated user."""
    try:
        review = Review.objects.get(pk=pk, status='approved')
    except Review.DoesNotExist:
        return Response({'error': 'Review not found or not approved'}, status=status.HTTP_404_NOT_FOUND)

    existing = ReviewHelpfulVote.objects.filter(review=review, user=request.user).first()
    if existing:
        # remove vote
        existing.delete()
        Review.objects.filter(pk=review.pk).update(helpful_count=F('helpful_count') - 1)
        review.refresh_from_db(fields=['helpful_count'])
        voted = False
    else:
        # add vote
        ReviewHelpfulVote.objects.create(review=review, user=request.user)
        Review.objects.filter(pk=review.pk).update(helpful_count=F('helpful_count') + 1)
        review.refresh_from_db(fields=['helpful_count'])
        voted = True

    return Response({'helpful_count': review.helpful_count, 'user_has_voted_helpful': voted})


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a review
    """
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_queryset(self):
        # Only allow owners to update/delete; reads require auth due to get_queryset scoping
        if self.request.user and self.request.user.is_authenticated:
            return Review.objects.filter(user=self.request.user)
        # Anonymous users shouldn't access this detail endpoint
        return Review.objects.none()


@api_view(['GET'])
@permission_classes([IsAdmin])
def review_admin_list(request):
    """Admin reviews listing used by the SPA admin page.
    This endpoint requires admin permission so only admins can list reviews
    in the admin SPA.
    """
    status_filter = request.query_params.get('status')
    qs = Review.objects.select_related('user', 'product', 'moderated_by').prefetch_related('images').all()
    if status_filter:
        qs = qs.filter(status=status_filter)

    # Simple pagination support (page, page_size)
    try:
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 25))
    except ValueError:
        page = 1
        page_size = 25

    offset = (page - 1) * page_size
    results = qs.order_by('-created_at')[offset:offset + page_size]

    serializer = ReviewSerializer(results, many=True, context={'request': request})
    return Response({
        'results': serializer.data,
        'count': qs.count(),
        'next': None,
        'previous': None
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def review_moderate(request, pk: int):
    """Admin endpoint to moderate (approve/reject) a review.
    Requires IsAdmin permission in all environments.
    """

    action = request.data.get('action')
    notes = request.data.get('notes', '')
    if action not in ['approve', 'reject']:
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        review = Review.objects.get(pk=pk)
    except Review.DoesNotExist:
        return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)

    if action == 'approve':
        review.status = 'approved'
        review.moderation_notes = ''
    else:
        review.status = 'rejected'
        review.moderation_notes = notes

    review.moderated_by = request.user
    review.moderated_at = timezone.now()
    review.admin_seen = True
    review.save()

    return Response(ReviewSerializer(review, context={'request': request}).data)