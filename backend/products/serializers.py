from rest_framework import serializers
from .models import Product, Category, Color, ProductImage, Subcategory, Favorite, Review, ReviewImage, ReviewHelpfulVote
from cart.models import OrderItem

class ColorSerializer(serializers.ModelSerializer):
    """Serializer for Color model"""
    
    class Meta:
        model = Color
        fields = ['id', 'name', 'hex_code', 'rgb_code', 'is_active']
        read_only_fields = ['id']


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for ProductImage model"""
    image_url = serializers.CharField(source='image.url', read_only=True)
    
    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'image', 'image_url', 'alt_text', 'is_main', 'order', 'created_at']
        read_only_fields = ['id', 'created_at', 'image_url']


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Category model
    """
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'description', 'is_active', 'order',
            'created_at', 'updated_at', 'product_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'product_count']
    
    def get_product_count(self, obj):
        return obj.products.filter(status='active').count()

class SubcategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Subcategory model
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Subcategory
        fields = [
            'id', 'name', 'description', 'category', 'category_name',
            'created_at', 'updated_at', 'product_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'product_count', 'category_name']

    def get_product_count(self, obj):
        return obj.products.filter(status='active').count()

class ProductListSerializer(serializers.ModelSerializer):
    """Serializer for Product list view (minimal fields)"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.FloatField(read_only=True)
    main_image_url = serializers.SerializerMethodField()
    colors = ColorSerializer(many=True, read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'short_description', 'price', 'original_price',
            'is_on_sale', 'stock_quantity', 'status', 'is_featured',
            'is_bestseller', 'category_name', 'subcategory_name', 'brand', 'sku',
            'main_image_url', 'is_in_stock', 'is_low_stock',
            'discount_percentage', 'view_count', 'sales_count',
            'colors', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'slug', 'is_in_stock', 'is_low_stock', 'discount_percentage',
            'view_count', 'sales_count', 'created_at', 'updated_at'
        ]
    
    def get_main_image_url(self, obj):
        main_image_url = obj.get_main_image()
        if main_image_url:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(main_image_url)
        return None

class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for Review model"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    moderated_by = serializers.CharField(source='moderated_by.username', read_only=True)
    moderation_notes = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    images = serializers.SerializerMethodField()
    helpful_count = serializers.IntegerField(read_only=True)
    user_has_voted_helpful = serializers.SerializerMethodField()
    verified_buyer = serializers.SerializerMethodField()


    class Meta:
        model = Review
        fields = [
            'id', 'product', 'user', 'user_name', 'user_email',
            'user_first_name', 'user_last_name',
            'rating', 'comment', 'created_at', 'updated_at',
            'product_name', 'moderated_by', 'moderation_notes', 'status', 'images', 'helpful_count', 'user_has_voted_helpful', 'verified_buyer'
        ]
        # user should be read-only for create requests; view will attach the user
        read_only_fields = ['id', 'user', 'user_name', 'user_email', 'user_first_name', 'user_last_name', 'created_at', 'updated_at',
                            'product_name', 'moderated_by', 'moderation_notes', 'status']

    def create(self, validated_data):
        # Always create a new review; do not upsert existing
        request = self.context.get('request')
        if request and getattr(request, 'user', None) and request.user.is_authenticated:
            user = request.user
        else:
            raise serializers.ValidationError({'user': 'Authentication required to create a review.'})

        # Merge kwargs from serializer.save have been injected into validated_data by DRF
        # Extract product and status safely to avoid duplicate kwargs
        product = validated_data.pop('product', None)
        if product is None:
            raise serializers.ValidationError({'product': 'Product is required.'})

        status_value = validated_data.pop('status', 'pending')

        review = Review.objects.create(user=user, product=product, admin_seen=False, status=status_value, **validated_data)

        # Save images if provided
        if request and hasattr(request, 'FILES'):
            files = request.FILES.getlist('images') or request.FILES.getlist('images[]')
            for i, f in enumerate(files[:4]):
                ReviewImage.objects.create(review=review, image=f)
        return review

    def update(self, instance, validated_data):
        # Update existing review: change rating/comment, reset moderation, append images
        request = self.context.get('request')
        instance.rating = validated_data.get('rating', instance.rating)
        instance.comment = validated_data.get('comment', instance.comment)
        instance.status = 'pending'
        instance.moderation_notes = ''
        instance.moderated_by = None
        instance.moderated_at = None
        instance.admin_seen = False
        instance.save()
        if request and hasattr(request, 'FILES'):
            files = request.FILES.getlist('images') or request.FILES.getlist('images[]')
            for i, f in enumerate(files[:4]):
                ReviewImage.objects.create(review=instance, image=f)
        return instance

    def get_images(self, obj):
        request = self.context.get('request')
        urls = []
        for img in getattr(obj, 'images', []).all() if hasattr(obj, 'images') else []:
            try:
                url = img.image.url
                if request:
                    urls.append(request.build_absolute_uri(url))
                else:
                    urls.append(url)
            except Exception:
                continue
        return urls

    def get_user_has_voted_helpful(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            try:
                return ReviewHelpfulVote.objects.filter(review=obj, user=user).exists()
            except Exception:
                return False
        return False

    def get_verified_buyer(self, obj):
        """Return True if the review's author has purchased this product."""
        try:
            return OrderItem.objects.filter(
                order__user=obj.user,
                product=obj.product,
                order__status__in=['paid', 'confirmed', 'processing', 'shipped', 'delivered']
            ).exists()
        except Exception:
            return False


class ProductDetailSerializer(serializers.ModelSerializer):
    """Serializer for Product detail view (all fields)"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.FloatField(read_only=True)
    all_images = serializers.SerializerMethodField()
    main_image_url = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    colors = ColorSerializer(many=True, read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    total_reviews = serializers.IntegerField(read_only=True)
    reviews = serializers.SerializerMethodField()

    def get_reviews(self, obj):
        # Get the 5 most recent reviews
        reviews = obj.reviews.all().order_by('-created_at')[:5]
        return ReviewSerializer(reviews, many=True, context=self.context).data

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'short_description', 'category', 'subcategory',
            'category_name', 'subcategory_name', 'sku', 'brand', 'price', 'original_price',
            'is_on_sale', 'stock_quantity', 'min_stock_level',
            'main_image', 'main_image_url', 'image_2', 'image_3', 'image_4', 'all_images', 'images',
            'specifications', 'meta_title', 'meta_description', 'slug',
            'status', 'is_featured', 'is_bestseller', 'weight', 'length',
            'width', 'height', 'colors', 'is_in_stock', 'is_low_stock',
            'discount_percentage', 'view_count', 'sales_count',
            'average_rating', 'total_reviews', 'reviews',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'slug', 'is_in_stock', 'is_low_stock', 'discount_percentage',
            'view_count', 'sales_count', 'created_at', 'updated_at',
            'average_rating', 'total_reviews', 'reviews'
        ]

    def get_main_image_url(self, obj):
        main_image_url = obj.get_main_image()
        if main_image_url:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(main_image_url)
        return None

    def get_all_images(self, obj):
        request = self.context.get('request')
        images = []

        # Get all images from the get_all_images method
        all_image_urls = obj.get_all_images()

        if request and all_image_urls:
            for image_url in all_image_urls:
                if not image_url.startswith('http'):
                    images.append(request.build_absolute_uri(image_url))
                else:
                    images.append(image_url)

        return images

class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating products"""
    colors = serializers.PrimaryKeyRelatedField(
        queryset=Color.objects.filter(is_active=True),
        many=True,
        required=False
    )
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'short_description', 'category', 'subcategory',
            'sku', 'brand', 'price', 'original_price', 'is_on_sale',
            'stock_quantity', 'min_stock_level', 'main_image',
            'image_2', 'image_3', 'image_4', 'specifications',
            'meta_title', 'meta_description', 'status', 'is_featured',
            'is_bestseller', 'weight', 'length', 'width', 'height', 'colors'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        # If subcategory provided, ensure it belongs to the selected category
        subcat = attrs.get('subcategory') or getattr(self.instance, 'subcategory', None)
        cat = attrs.get('category') or getattr(self.instance, 'category', None)
        if subcat is not None:
            if cat is None:
                raise serializers.ValidationError({'subcategory': 'Categoria deve ser informada quando subcategoria é escolhida.'})
            if subcat.category_id != cat.id:
                raise serializers.ValidationError({'subcategory': 'Subcategoria não pertence à categoria selecionada.'})
        return attrs
    
    def validate_price(self, value):
        """Validate that price is positive"""
        if value <= 0:
            raise serializers.ValidationError("O preço deve ser maior que zero.")
        return value
    
    def validate_stock_quantity(self, value):
        """Validate that stock quantity is not negative"""
        if value < 0:
            raise serializers.ValidationError("A quantidade em estoque não pode ser negativa.")
        return value
    
    def validate_sku(self, value):
        """Validate SKU uniqueness only if provided"""
        if value:  # Only validate if SKU is provided (since it's auto-generated now)
            if self.instance:
                # Update case - exclude current instance
                if Product.objects.exclude(id=self.instance.id).filter(sku=value).exists():
                    raise serializers.ValidationError("Já existe um produto com este SKU.")
            else:
                # Create case
                if Product.objects.filter(sku=value).exists():
                    raise serializers.ValidationError("Já existe um produto com este SKU.")
        return value
    
    def create(self, validated_data):
        """Create product with colors"""
        colors_data = validated_data.pop('colors', [])
        product = Product.objects.create(**validated_data)
        if colors_data:
            product.colors.set(colors_data)
        return product
    
    def update(self, instance, validated_data):
        """Update product with colors"""
        colors_data = validated_data.pop('colors', None)
        
        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update colors if provided
        if colors_data is not None:
            instance.colors.set(colors_data)
        
        return instance


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for Favorite model"""
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Favorite
        fields = ['id', 'product', 'product_id', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        """Create favorite with current user"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class FavoriteCreateSerializer(serializers.Serializer):
    """Simple serializer for creating favorites"""
    product_id = serializers.IntegerField()
    
    def validate_product_id(self, value):
        """Validate product exists"""
        from .models import Product
        if not Product.objects.filter(id=value, status='active').exists():
            raise serializers.ValidationError("Produto não encontrado ou inativo.")
        return value
