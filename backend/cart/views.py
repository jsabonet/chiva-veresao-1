from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import status
import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from customers.views import IsAdmin
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from products.models import Product, Color
from .models import Cart, CartItem, Coupon, CartHistory, AbandonedCart
from .serializers import (
    CartSerializer, CartItemSerializer, AddToCartSerializer,
    UpdateCartItemSerializer, CouponSerializer, ApplyCouponSerializer,
    CartHistorySerializer, AbandonedCartSerializer, CartMergeSerializer
)
from .models import ShippingMethod
from .serializers import ShippingMethodSerializer
import logging
from decimal import Decimal, ROUND_HALF_UP

logger = logging.getLogger(__name__)


class CartAPIView(APIView):
    """
    Main cart API endpoint supporting both authenticated and anonymous users
    """
    permission_classes = [AllowAny]
    
    def get_cart(self, request):
        """Get or create cart for current user/session"""
        if request.user.is_authenticated:
            cart, created = Cart.objects.get_or_create(
                user=request.user,
                status='active',
                defaults={'last_activity': timezone.now()}
            )
        else:
            # For anonymous users, use session key
            session_key = request.session.session_key
            if not session_key:
                request.session.create()
                session_key = request.session.session_key
            
            cart, created = Cart.objects.get_or_create(
                session_key=session_key,
                status='active',
                defaults={'last_activity': timezone.now()}
            )
        
        if created:
            CartHistory.objects.create(cart=cart, event='created')
        
        return cart
    
    def get(self, request):
        """Get current cart contents"""
        try:
            cart = self.get_cart(request)
            
            # ALWAYS refresh cart item prices when accessing cart
            refreshed_items = 0
            try:
                for item in cart.items.select_related('product').all():
                    if item.product and item.product.status == 'active':
                        old_price = item.price
                        new_price = item.product.price
                        if old_price != new_price:
                            logger.info(f"🔄 CART ACCESS PRICE REFRESH: {item.product.name} {old_price} -> {new_price}")
                            item.price = new_price
                            item.save(update_fields=['price', 'updated_at'])
                            refreshed_items += 1
                if refreshed_items > 0:
                    cart.calculate_totals()
                    logger.info(f"🎯 REFRESHED {refreshed_items} cart item prices on cart access")
            except Exception as e:
                logger.error(f'Error refreshing prices on cart access: {str(e)}')
            
            cart.last_activity = timezone.now()
            cart.save(update_fields=['last_activity'])
            
            serializer = CartSerializer(cart)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error getting cart: {str(e)}")
            return Response(
                {'error': 'Failed to get cart'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Add item to cart"""
        try:
            serializer = AddToCartSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            cart = self.get_cart(request)
            product_id = serializer.validated_data['product_id']
            color_id = serializer.validated_data.get('color_id')
            quantity = serializer.validated_data['quantity']
            
            # Get product and validate stock
            product = get_object_or_404(Product, id=product_id, status='active')
            color = None
            if color_id:
                color = get_object_or_404(Color, id=color_id, is_active=True)
            
            # Check stock availability
            if product.stock_quantity < quantity:
                return Response(
                    {'error': f'Insufficient stock. Available: {product.stock_quantity}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                # Try to get existing cart item
                try:
                    cart_item = CartItem.objects.get(
                        cart=cart, product=product, color=color
                    )
                    # Update quantity if item exists
                    new_quantity = cart_item.quantity + quantity
                    if new_quantity > product.stock_quantity:
                        return Response(
                            {'error': f'Total quantity exceeds stock. Available: {product.stock_quantity}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    cart_item.quantity = new_quantity
                    cart_item.save()
                    
                    CartHistory.objects.create(
                        cart=cart,
                        event='item_updated',
                        description=f'Updated {product.name} quantity to {new_quantity}',
                        metadata={'product_id': product.id, 'new_quantity': new_quantity}
                    )
                except CartItem.DoesNotExist:
                    # Create new cart item
                    cart_item = CartItem.objects.create(
                        cart=cart,
                        product=product,
                        color=color,
                        quantity=quantity,
                        price=product.price
                    )
                    
                    CartHistory.objects.create(
                        cart=cart,
                        event='item_added',
                        description=f'Added {product.name} to cart',
                        metadata={'product_id': product.id, 'quantity': quantity}
                    )
                
                # Update cart activity
                cart.last_activity = timezone.now()
                cart.save(update_fields=['last_activity'])
                # Return updated cart to client
                cart_serializer = CartSerializer(cart)
                return Response(cart_serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Error adding item to cart: {str(e)}")
            return Response(
                {'error': 'Failed to add item to cart'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request):
        """Clear entire cart"""
        try:
            cart = self.get_cart(request)
            
            with transaction.atomic():
                cart.items.all().delete()
                cart.applied_coupon = None
                cart.discount_amount = 0
                cart.save()
                
                CartHistory.objects.create(
                    cart=cart,
                    event='cart_cleared',
                    description='Cart cleared'
                )
            
            cart_serializer = CartSerializer(cart)
            return Response(cart_serializer.data)
            
        except Exception as e:
            logger.error(f"Error clearing cart: {str(e)}")
            return Response(
                {'error': 'Failed to clear cart'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# --- Shipping methods admin API ---
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def shipping_methods_list_create(request):
    """List all shipping methods (admin) or create a new one"""
    # Only admins allowed
    if not getattr(request.user, 'is_staff', False):
        return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        methods = ShippingMethod.objects.all().order_by('-created_at')
        serializer = ShippingMethodSerializer(methods, many=True)
        return Response(serializer.data)

    # POST - create
    serializer = ShippingMethodSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def shipping_method_detail(request, method_id):
    if not getattr(request.user, 'is_staff', False):
        return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    try:
        method = ShippingMethod.objects.get(id=method_id)
    except ShippingMethod.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ShippingMethodSerializer(method)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = ShippingMethodSerializer(method, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    method.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
def shipping_methods_public_list(request):
    """Public endpoint returning enabled shipping methods for checkout"""
    methods = ShippingMethod.objects.filter(enabled=True).order_by('created_at')
    serializer = ShippingMethodSerializer(methods, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def sync_cart(request):
    """Replace server cart items with the list provided by the client.
    Accepts: { items: [{ product_id, quantity, color_id? }] }
    Works for authenticated users and anonymous sessions.
    """
    try:
        items = request.data.get('items') or []
        if not isinstance(items, list):
            return Response({'error': 'Invalid items payload'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create the appropriate cart
        if request.user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(
                user=request.user,
                status='active',
                defaults={'last_activity': timezone.now()}
            )
        else:
            session_key = request.session.session_key
            if not session_key:
                request.session.create()
                session_key = request.session.session_key
            cart, _ = Cart.objects.get_or_create(
                session_key=session_key,
                status='active',
                defaults={'last_activity': timezone.now()}
            )

        with transaction.atomic():
            # Clear existing items
            cart.items.all().delete()

            # Add provided items
            for it in items:
                try:
                    product_id = it.get('product_id') or it.get('id')
                    quantity = int(it.get('quantity') or 1)
                    if quantity < 1:
                        quantity = 1
                    color_id = it.get('color_id')

                    logger.info(f"Sync cart: adding product_id={product_id}, quantity={quantity}, color_id={color_id}")
                    
                    try:
                        product = Product.objects.get(id=product_id, status='active')
                    except Product.DoesNotExist:
                        logger.warning(f"Product {product_id} not found or inactive, skipping")
                        continue
                        
                    if product.stock_quantity is not None and quantity > product.stock_quantity:
                        quantity = product.stock_quantity

                    color = None
                    if color_id:
                        try:
                            color = Color.objects.get(id=color_id, is_active=True)
                        except Color.DoesNotExist:
                            color = None

                    cart_item = CartItem.objects.create(
                        cart=cart,
                        product=product,
                        color=color,
                        quantity=quantity,
                        price=product.price,
                    )
                    logger.info(f"Added cart item: {product.name} x{quantity} @ {product.price}")
                except Exception as e:
                    logger.warning(f"Skipping invalid item in sync: {it} ({e})")

            # Recalculate totals and update activity
            cart.calculate_totals()
            cart.last_activity = timezone.now()
            cart.save(update_fields=['last_activity'])

        serializer = CartSerializer(cart)
        logger.info(f"Sync result: cart {cart.id} with {cart.items.count()} items, total {cart.total}")
        return Response(serializer.data)

    except Exception:
        logger.exception('Error syncing cart')
        return Response({'error': 'Failed to sync cart'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CartItemAPIView(APIView):
    """
    API for individual cart item operations
    """
    permission_classes = [AllowAny]
    
    def get_cart_item(self, request, item_id):
        """Get cart item ensuring it belongs to current user/session"""
        if request.user.is_authenticated:
            return get_object_or_404(
                CartItem, 
                id=item_id, 
                cart__user=request.user,
                cart__status='active'
            )
        else:
            session_key = request.session.session_key
            return get_object_or_404(
                CartItem,
                id=item_id,
                cart__session_key=session_key,
                cart__status='active'
            )
    
    def put(self, request, item_id):
        """Update cart item quantity"""
        try:
            serializer = UpdateCartItemSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            cart_item = self.get_cart_item(request, item_id)
            new_quantity = serializer.validated_data['quantity']
            
            # Check stock availability
            if new_quantity > cart_item.product.stock_quantity:
                return Response(
                    {'error': f'Insufficient stock. Available: {cart_item.product.stock_quantity}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                cart_item.quantity = new_quantity
                cart_item.save()
                
                CartHistory.objects.create(
                    cart=cart_item.cart,
                    event='item_updated',
                    description=f'Updated {cart_item.product.name} quantity to {new_quantity}',
                    metadata={'product_id': cart_item.product.id, 'new_quantity': new_quantity}
                )
                
                # Update cart activity
                cart_item.cart.last_activity = timezone.now()
                cart_item.cart.save(update_fields=['last_activity'])
            
            cart_serializer = CartSerializer(cart_item.cart)
            return Response(cart_serializer.data)
            
        except Exception as e:
            logger.error(f"Error updating cart item: {str(e)}")
            return Response(
                {'error': 'Failed to update cart item'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, item_id):
        """Remove item from cart"""
        try:
            cart_item = self.get_cart_item(request, item_id)
            cart = cart_item.cart
            
            with transaction.atomic():
                product_name = cart_item.product.name
                cart_item.delete()
                
                CartHistory.objects.create(
                    cart=cart,
                    event='item_removed',
                    description=f'Removed {product_name} from cart',
                    metadata={'product_id': cart_item.product.id}
                )
                
                # Update cart activity
                cart.last_activity = timezone.now()
                cart.save(update_fields=['last_activity'])
            
            cart_serializer = CartSerializer(cart)
            return Response(cart_serializer.data)
            
        except Exception as e:
            logger.error(f"Error removing cart item: {str(e)}")
            return Response(
                {'error': 'Failed to remove cart item'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CouponAPIView(APIView):
    """
    API for coupon operations
    """
    permission_classes = [AllowAny]
    
    def get_cart(self, request):
        """Get current cart"""
        if request.user.is_authenticated:
            return Cart.objects.filter(user=request.user, status='active').first()
        else:
            session_key = request.session.session_key
            if session_key:
                return Cart.objects.filter(session_key=session_key, status='active').first()
        return None
    
    def post(self, request):
        """Apply coupon to cart"""
        try:
            cart = self.get_cart(request)
            if not cart:
                return Response(
                    {'error': 'No active cart found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = ApplyCouponSerializer(
                data=request.data,
                context={'request': request, 'cart': cart}
            )
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            coupon_code = serializer.validated_data['coupon_code']
            coupon = get_object_or_404(Coupon, code=coupon_code)
            
            with transaction.atomic():
                # Remove existing coupon if any
                if cart.applied_coupon:
                    old_coupon_code = cart.applied_coupon.code
                    cart.applied_coupon = None
                    
                    CartHistory.objects.create(
                        cart=cart,
                        event='coupon_removed',
                        description=f'Removed coupon {old_coupon_code}',
                        metadata={'coupon_code': old_coupon_code}
                    )
                
                # Apply new coupon
                cart.applied_coupon = coupon
                cart.save()
                cart.calculate_totals()  # Recalculate with discount
                
                CartHistory.objects.create(
                    cart=cart,
                    event='coupon_applied',
                    description=f'Applied coupon {coupon_code}',
                    metadata={'coupon_code': coupon_code, 'discount_amount': str(cart.discount_amount)}
                )
            
            cart_serializer = CartSerializer(cart)
            return Response({
                'message': 'Coupon applied successfully',
                'cart': cart_serializer.data,
                'discount_amount': cart.discount_amount
            })
            
        except Exception as e:
            logger.error(f"Error applying coupon: {str(e)}")
            return Response(
                {'error': 'Failed to apply coupon'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request):
        """Remove coupon from cart"""
        try:
            cart = self.get_cart(request)
            if not cart or not cart.applied_coupon:
                return Response(
                    {'error': 'No coupon applied to cart'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            with transaction.atomic():
                coupon_code = cart.applied_coupon.code
                cart.applied_coupon = None
                cart.save()
                cart.calculate_totals()  # Recalculate without discount
                
                CartHistory.objects.create(
                    cart=cart,
                    event='coupon_removed',
                    description=f'Removed coupon {coupon_code}',
                    metadata={'coupon_code': coupon_code}
                )
            
            cart_serializer = CartSerializer(cart)
            return Response({
                'message': 'Coupon removed successfully',
                'cart': cart_serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error removing coupon: {str(e)}")
            return Response(
                {'error': 'Failed to remove coupon'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_coupon(request):
    """Validate a coupon without applying it"""
    coupon_code = request.GET.get('code')
    if not coupon_code:
        return Response(
            {'error': 'Coupon code is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        coupon = get_object_or_404(Coupon, code=coupon_code)
        user = request.user if request.user.is_authenticated else None
        
        # Get cart total for validation
        cart_total = None
        if request.user.is_authenticated:
            cart = Cart.objects.filter(user=request.user, status='active').first()
        else:
            session_key = request.session.session_key
            cart = Cart.objects.filter(session_key=session_key, status='active').first() if session_key else None
        
        if cart:
            cart_total = cart.subtotal
        
        is_valid = coupon.is_valid(user=user, cart_total=cart_total)
        
        if is_valid and cart_total:
            discount_amount = coupon.calculate_discount(cart_total)
        else:
            discount_amount = 0
        
        return Response({
            'valid': is_valid,
            'coupon': CouponSerializer(coupon).data,
            'discount_amount': discount_amount,
            'error_message': None if is_valid else 'Coupon is not valid for current conditions'
        })
        
    except Exception as e:
        logger.error(f"Error validating coupon: {str(e)}")
        return Response(
            {'error': 'Failed to validate coupon'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def merge_cart(request):
    """Merge anonymous cart with user cart on login"""
    try:
        serializer = CartMergeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        anonymous_cart_data = serializer.validated_data['anonymous_cart_data']
        
        # Get or create user cart
        user_cart, created = Cart.objects.get_or_create(
            user=request.user,
            status='active',
            defaults={'last_activity': timezone.now()}
        )
        
        with transaction.atomic():
            for item_data in anonymous_cart_data:
                product_id = item_data['product_id']
                quantity = item_data['quantity']
                color_id = item_data.get('color_id')
                
                try:
                    product = Product.objects.get(id=product_id, status='active')
                    color = Color.objects.get(id=color_id, is_active=True) if color_id else None
                    
                    # Try to find existing item in user cart
                    try:
                        existing_item = CartItem.objects.get(
                            cart=user_cart,
                            product=product,
                            color=color
                        )
                        # Merge quantities
                        existing_item.quantity += quantity
                        existing_item.save()
                    except CartItem.DoesNotExist:
                        # Create new item
                        CartItem.objects.create(
                            cart=user_cart,
                            product=product,
                            color=color,
                            quantity=quantity,
                            price=product.price
                        )
                
                except (Product.DoesNotExist, Color.DoesNotExist):
                    # Skip invalid items
                    continue
            
            # Record merge event
            CartHistory.objects.create(
                cart=user_cart,
                event='cart_merged',
                description='Merged anonymous cart with user cart',
                metadata={'items_merged': len(anonymous_cart_data)}
            )
        
        cart_serializer = CartSerializer(user_cart)
        return Response({
            'message': 'Cart merged successfully',
            'cart': cart_serializer.data
        })
        
    except Exception as e:
        logger.error(f"Error merging cart: {str(e)}")
        return Response(
            {'error': 'Failed to merge cart'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAdmin])
@api_view(['GET'])
def abandoned_carts(request):
    """Get abandoned carts for current user (admin functionality)"""
    try:
        abandoned_carts = AbandonedCart.objects.select_related('cart').prefetch_related('cart__items__product')
        # Filter by date range if provided
        days = request.GET.get('days', 7)
        try:
            days = int(days)
            from_date = timezone.now() - timezone.timedelta(days=days)
            abandoned_carts = abandoned_carts.filter(created_at__gte=from_date)
        except ValueError:
            pass

        serializer = AbandonedCartSerializer(abandoned_carts, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error getting abandoned carts: {str(e)}")



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    """Initiate a payment via Paysuite for the current cart with modern checkout support"""
    try:
        # Determine the correct cart to use: prefer merging session cart into user cart when both exist
        # Ensure session exists
        session_key = request.session.session_key
        if not session_key:
            request.session.create()
            session_key = request.session.session_key

        user_cart = Cart.objects.filter(user=request.user, status='active').first()
        session_cart = Cart.objects.filter(session_key=session_key, status='active').first()

        # If both carts exist and session cart has items, merge into user cart
        if request.user.is_authenticated and user_cart and session_cart and session_cart.items.exists():
            logger.info(f"🧩 Merging session cart {session_cart.id} into user cart {user_cart.id} for user {request.user}")
            with transaction.atomic():
                for item in session_cart.items.select_related('product', 'color').all():
                    try:
                        existing = CartItem.objects.get(cart=user_cart, product=item.product, color=item.color)
                        existing.quantity += item.quantity
                        existing.save(update_fields=['quantity', 'updated_at'])
                    except CartItem.DoesNotExist:
                        CartItem.objects.create(
                            cart=user_cart,
                            product=item.product,
                            color=item.color,
                            quantity=item.quantity,
                            price=item.price,
                        )
                # Mark session cart as converted and clear items
                session_cart.items.all().delete()
                session_cart.status = 'converted'
                session_cart.save(update_fields=['status'])
                CartHistory.objects.create(
                    cart=user_cart,
                    event='cart_merged_for_checkout',
                    description=f'Merged session cart {session_cart.id} into user cart {user_cart.id}',
                    metadata={'session_cart_id': session_cart.id, 'user_cart_id': user_cart.id}
                )
            cart = user_cart
        else:
            # Choose the cart that actually has items, but fallback to any available cart
            preferred = None
            if user_cart and user_cart.items.exists():
                preferred = user_cart
            elif session_cart and session_cart.items.exists():
                preferred = session_cart
            else:
                # If no cart has items, prefer user cart if authenticated, otherwise session cart
                preferred = user_cart if request.user.is_authenticated else session_cart

            # If only session cart exists, attach it to the user so payment is correct
            if request.user.is_authenticated and preferred is session_cart and session_cart:
                logger.info(f"🔗 Attaching session cart {session_cart.id} to user {request.user}")
                session_cart.user = request.user
                session_cart.session_key = None
                session_cart.save(update_fields=['user', 'session_key'])
                cart = session_cart
            else:
                cart = preferred or user_cart or session_cart

        # Get client amount early for validation
        client_amount = request.data.get('amount')
        
        if not cart:
            # Create a new cart if none exists
            if request.user.is_authenticated:
                cart = Cart.objects.create(
                    user=request.user,
                    status='active',
                    last_activity=timezone.now()
                )
                logger.info(f"🆕 Created new user cart {cart.id} for {request.user}")
            else:
                cart = Cart.objects.create(
                    session_key=session_key,
                    status='active',
                    last_activity=timezone.now()
                )
                logger.info(f"🆕 Created new session cart {cart.id}")
            
            # If no cart and no client amount, it's definitely empty
            if not client_amount:
                return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        # If cart is empty but client provided amount, allow payment (they may have items in frontend)
        if not cart.items.exists() and not client_amount:
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        # ALWAYS refresh cart item prices from current product prices before checkout
        # This ensures duplicated/old items get the latest defined values
        refreshed_items = 0
        try:
            for item in cart.items.select_related('product').all():
                if item.product and item.product.status == 'active':
                    old_price = item.price
                    new_price = item.product.price
                    if old_price != new_price:
                        logger.info(f"🔄 PRICE REFRESH: {item.product.name} {old_price} -> {new_price}")
                        item.price = new_price
                        # Update item without changing quantity; save triggers totals recalculation
                        item.save(update_fields=['price', 'updated_at'])
                        refreshed_items += 1
                        try:
                            CartHistory.objects.create(
                                cart=cart,
                                event='item_price_refreshed',
                                description=f"Updated price for {item.product.name}: {old_price} -> {new_price}",
                                metadata={'product_id': item.product.id, 'old_price': str(old_price), 'new_price': str(new_price)}
                            )
                        except Exception:
                            # Logging-only path; avoid breaking checkout
                            logger.warning('Failed to record price refresh history entry')
            if refreshed_items > 0:
                logger.info(f"🎯 REFRESHED {refreshed_items} cart item prices before checkout")
        except Exception:
            logger.exception('Failed to refresh cart item prices prior to checkout')

        # Recalculate totals after potential price refresh
        cart.calculate_totals()

        # Include shipping: prefer server-side configured shipping_method pricing to avoid client tampering
        from decimal import Decimal, ROUND_HALF_UP
        client_shipping = request.data.get('shipping_amount')
        client_currency = request.data.get('currency') or 'MZN'
        try:
            shipping_dec = Decimal(str(client_shipping)) if client_shipping is not None else Decimal('0.00')
            if shipping_dec < 0:
                shipping_dec = Decimal('0.00')
        except Exception:
            shipping_dec = Decimal('0.00')

        # If client provided a shipping_method, prefer authoritative price from DB
        shipping_method = request.data.get('shipping_method')
        if shipping_method:
            try:
                sm = ShippingMethod.objects.get(id=shipping_method, enabled=True)
                # Use server-side configured price but honor method-level free-shipping threshold
                shipping_dec = Decimal(str(sm.price))
                try:
                    min_order = Decimal(str(sm.min_order or '0'))
                    cart_total = cart.total or Decimal('0.00')
                    # If the cart total reaches or exceeds the method's min_order, shipping is free
                    if min_order > Decimal('0.00') and cart_total >= min_order:
                        logger.info(f"Free shipping applied for method {shipping_method}: cart_total={cart_total} >= min_order={min_order}")
                        shipping_dec = Decimal('0.00')
                except Exception:
                    # if parsing fails, fallback to configured price
                    logger.debug('Could not parse min_order for shipping method; using configured price')
            except Exception:
                # If method not found or disabled, keep client-provided shipping_dec (already sanitized)
                logger.warning(f"Shipping method {shipping_method} not found or disabled; using client shipping if provided")

        charge_total = (cart.total or Decimal('0.00')) + shipping_dec

        if client_amount is not None:
            try:
                sent = Decimal(str(client_amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                if sent != charge_total:
                    logger.warning(f"Client amount mismatch: sent={sent} vs calculated_total={charge_total} (cart_total={cart.total} + shipping={shipping_dec})")
                    # If client provided explicit amount and it's reasonable, use it instead of rejecting
                    # This handles cases where frontend cart state differs from backend
                    if sent > 0 and sent < Decimal('1000000'):  # Basic sanity check
                        logger.info(f"Using client-provided amount {sent} instead of calculated {charge_total}")
                        # Only accept client-provided amount if it matches server-side shipping method price
                        if not shipping_method:
                            charge_total = sent
                        else:
                            # Mismatch when shipping_method was provided -> reject to avoid tampering
                            return Response({
                                'error': 'amount_mismatch',
                                'message': 'O total enviado pelo cliente não corresponde ao total calculado com o método de envio selecionado.',
                                'sent': str(sent),
                                'calculated': str(charge_total),
                                'cart_total': str(cart.total),
                                'shipping': str(shipping_dec),
                            }, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        return Response({
                            'error': 'amount_mismatch',
                            'message': f'O total enviado pelo cliente ({sent} {client_currency}) não corresponde ao total calculado ({charge_total} MZN).',
                            'sent': str(sent),
                            'calculated': str(charge_total),
                            'cart_total': str(cart.total),
                            'shipping': str(shipping_dec),
                        }, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                logger.warning('Could not parse client amount for validation')
        
        # Instead of creating an Order now, create a Payment tied to the cart.
        # The Order will be created only when we receive confirmation (webhook) from PaySuite.
        from .models import Payment

        # Extract checkout data (store for later order creation)
        shipping_address = request.data.get('shipping_address', {})
        billing_address = request.data.get('billing_address', shipping_address)
        customer_notes = request.data.get('customer_notes', '')
        # Use server-authoritative shipping_dec computed above
        shipping_cost = shipping_dec
        # Reuse shipping_method from earlier (may be None)
        shipping_method = request.data.get('shipping_method') or None

        # Payment method and data requested
        payment_data = request.data
        method = payment_data.get('method')

        # Try to infer method from phone if not provided
        phone = payment_data.get('phone')
        if not method:
            inferred = None
            if phone:
                try:
                    from cart.utils.phone_validation import get_payment_method_from_phone
                    inferred = get_payment_method_from_phone(phone)
                except Exception:
                    inferred = None
            if inferred:
                method = inferred
                logger.info(f"Inferred payment method '{method}' from phone {phone}")
            else:
                # Do not silently default to mpesa; require explicit method to avoid surprises
                return Response({'error': 'missing_method', 'message': 'O campo "method" é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        # Extract method-specific data
        phone = payment_data.get('phone')  # For mpesa/emola
        card_data = {
            'cardNumber': payment_data.get('cardNumber'),
            'expiryDate': payment_data.get('expiryDate'),
            'cvv': payment_data.get('cvv'),
            'cardholderName': payment_data.get('cardholderName')
        } if method == 'card' else None

        bank_data = {
            'accountNumber': payment_data.get('accountNumber'),
            'bankName': payment_data.get('bankName')
        } if method == 'transfer' else None

        # Create payment record (no order yet). Keep original request payload inside request_data
        payment = Payment.objects.create(
            order=None,
            cart=cart,
            method=method,
            amount=charge_total,
            currency=client_currency,
            status='initiated',
            request_data={
                'shipping_address': shipping_address,
                'billing_address': billing_address,
                'shipping_method': shipping_method,
                'customer_notes': customer_notes,
                'shipping_cost': str(shipping_cost),
                'meta': {k: v for k, v in request.data.items() if k not in ['shipping_address','billing_address','shipping_method','customer_notes','shipping_amount']}
            }
        )

        # Call Paysuite - prefer the real Paysuite client by default.
        # Legacy behavior used a SafePaysuiteClient when PAYSUITE_TEST_MODE was set to 'mock'/'sandbox'.
        # Per request, switch to real checkout by default; keep an explicit override to use the mock for local testing.
        test_mode = os.getenv('PAYSUITE_TEST_MODE', 'production')
        # Only use the SafePaysuiteClient when explicitly requested via PAYSUITE_TEST_MODE=mock
        if test_mode == 'mock':
            from .payments.safe_paysuite import SafePaysuiteClient
            client = SafePaysuiteClient()
        else:
            # Default: use the real Paysuite client (sandbox vs production handled by its config)
            from .payments.paysuite import PaysuiteClient
            client = PaysuiteClient()
        # Correct API path for webhook lives under /api/cart/
        callback_url = request.build_absolute_uri('/api/cart/payments/webhook/')
        return_url = request.build_absolute_uri(f'/orders/status')
        # Create a unique reference for this payment (<=50 chars per docs)
        reference = f"PAY{payment.id:06d}"

        # Prepare payment creation data with validation
        payment_creation_data = {
            'amount': float(payment.amount),  # Ensure float format
            'method': method,
            'reference': reference,
            'description': f"Payment {payment.id} for cart {cart.id}",
            'return_url': return_url,
            'callback_url': callback_url,
            # Help correlate checkout with our order/cart during debugging
            'metadata': {
                'payment_id': payment.id,
                'cart_id': cart.id,
                'user': getattr(request.user, 'username', None) or 'anonymous',
                # Echo some client context for traceability
                'ui_total_sent': str(client_amount) if client_amount is not None else None,
                'ui_shipping_sent': str(client_shipping) if client_shipping is not None else None,
                'ui_currency': client_currency,
            }
        }

        # Validate and format amount for PaySuite
        if payment.amount <= 0:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        # Use the payment amount directly (already in MZN)
        formatted_amount = float(payment.amount)
        print(f"💰 PAYMENT AMOUNT: {formatted_amount} MZN")

        # Update payment creation data with amount
        payment_creation_data['amount'] = formatted_amount

        # Enforce amount limit only for E-Mola (default 100,000 MZN unless overridden by env)
        if method == 'emola':
            try:
                emola_max = Decimal(os.getenv('EMOLA_MAX_AMOUNT', '100000'))
            except Exception:
                emola_max = Decimal('100000')
            total_dec = Decimal(str(formatted_amount))
            if total_dec > emola_max:
                return Response({
                    'error': 'amount_exceeds_method_limit',
                    'message': f'O valor total {total_dec} MZN excede o limite para EMOLA: {emola_max} MZN.',
                    'method': method,
                    'limit': str(emola_max),
                    'total': str(total_dec),
                    'suggestions': [
                        'Escolha outro método (Cartão/Transferência Bancária)',
                        'Divida a compra em parcelas menores abaixo do limite'
                    ]
                }, status=status.HTTP_400_BAD_REQUEST)

        # Log payment details for debugging
        print(f"💰 PAYMENT DETAILS: ID={payment.id}, Charge={payment.amount} (cart={cart.total} + shipping={shipping_dec}), Method={method}")
        print(f"🛒 CART DETAILS: Items={cart.items.count()}, CartTotal={cart.total}, Shipping={shipping_dec}, Calculated={charge_total}")
        
        # Add method-specific data
        if method in ['mpesa', 'emola'] and phone:
            # Validate and format phone number
            try:
                from cart.utils.phone_validation import validate_mozambique_phone, get_payment_method_from_phone
                
                phone_validation = validate_mozambique_phone(phone)
                if not phone_validation['valid']:
                    return Response({'error': f"Invalid phone number: {phone_validation['error']}"}, 
                                  status=status.HTTP_400_BAD_REQUEST)
                
                # Use recommended format for PaySuite
                formatted_phone = phone_validation['recommended']
                carrier = phone_validation['carrier']
                
                # Auto-detect payment method based on carrier
                suggested_method = get_payment_method_from_phone(phone)
                if method != suggested_method:
                    print(f"⚠️  METHOD MISMATCH: User selected {method}, but phone {phone} suggests {suggested_method} (carrier: {carrier})")
                
                payment_creation_data['msisdn'] = formatted_phone
                
                print(f"📱 PHONE VALIDATION: Original={phone}, Formatted={formatted_phone}, Carrier={carrier}, Method={method}")
                
                # Test mode: try without any "direct" flags first
                test_mode = os.getenv('PAYSUITE_TEST_MODE', 'clean')
                if test_mode == 'clean':
                    # Only send msisdn, no additional flags
                    pass  
                else:
                    payment_creation_data['direct_payment'] = True
                    # For direct mobile payments, we don't want checkout redirect
                    # Remove return_url to indicate direct processing
                    payment_creation_data.pop('return_url', None)
                    
            except ImportError:
                # Fallback to old method if validation module not available
                clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '')
                payment_creation_data['msisdn'] = clean_phone
                print(f"📱 PHONE FALLBACK: Original={phone}, Clean={clean_phone}")
        elif method == 'card' and card_data and card_data.get('cardNumber'):
            payment_creation_data.update(card_data)
        elif method == 'transfer' and bank_data and bank_data.get('accountNumber'):
            payment_creation_data.update(bank_data)
        
        # Log the payment creation data for debugging
        logger.info(f"Creating payment with data: {payment_creation_data}")
        print(f"🔄 PAYSUITE REQUEST: {payment_creation_data}")
        
        api_resp = client.create_payment(**payment_creation_data)
        
        # Log the PaySuite response
        logger.info(f"PaySuite response: {api_resp}")
        print(f"📥 PAYSUITE RESPONSE: {api_resp}")

        # Expect response: { status: 'success'|'error', data?: {...}, message?: str }
        status_str = api_resp.get('status')
        if status_str != 'success':
            msg = api_resp.get('message') or 'Gateway error'
            err_code = (api_resp.get('error_code') or '').upper()
            payment.status = 'failed'
            payment.raw_response = api_resp
            payment.save(update_fields=['status', 'raw_response'])
            # Mapear erro de validação de valor (limite de teste) para 400 em vez de 502
            http_status = status.HTTP_400_BAD_REQUEST if err_code in ['AMOUNT_INVALID'] else status.HTTP_502_BAD_GATEWAY
            return Response({'error': msg, 'code': err_code or None}, status=http_status)

        data = api_resp.get('data') or {}
        external_id = data.get('id')
        external_ref = data.get('reference')
        checkout_url = data.get('checkout_url')

        # Store reference and raw response
        payment.paysuite_reference = external_id or external_ref
        payment.raw_response = api_resp
        payment.status = 'pending'
        payment.save(update_fields=['paysuite_reference', 'raw_response', 'status'])

        # Prepare response (no order yet)
        response_data = {
            'payment': {
                'id': external_id,
                'reference': external_ref,
                'is_direct': method in ['mpesa', 'emola'] and phone is not None,
                'method': method,
                'phone': phone if method in ['mpesa', 'emola'] else None
            }
        }
        
        # For mobile payments with phone, force direct processing
        # even if PaySuite returns checkout_url (API limitation workaround)
        if method in ['mpesa', 'emola'] and phone:
            print(f"🔄 FORCING DIRECT PAYMENT for {method} with phone {phone}")
            # Don't include checkout_url to prevent frontend redirect
            # The actual payment processing will happen via PaySuite's backend
        else:
            response_data['payment']['checkout_url'] = checkout_url
            
        # Optionally clear cart immediately after initiating payment (useful for test flows)
        try:
            clear_on_initiate = os.getenv('CART_CLEAR_ON_INITIATE', '0').lower() in ['1', 'true', 'yes']
            if clear_on_initiate:
                # Clear items and convert the cart so subsequent attempts don't reuse stale data
                if cart and cart.items.exists():
                    cart.items.all().delete()
                cart.status = 'converted'
                cart.save(update_fields=['status'])
                CartHistory.objects.create(
                    cart=cart,
                    event='cart_cleared_on_initiate',
                    description=f'Cart cleared on initiate for payment {payment.id}',
                    metadata={'payment_id': payment.id}
                )
        except Exception:
            logger.warning('Failed to clear cart on initiate (non-fatal)')

        # Create a lightweight Order now so frontend can reference it immediately.
        # The webhook will detect payment.order and won't recreate the Order.
        try:
            from .models import Order

            order = Order.objects.create(
                cart=cart,
                user=cart.user if cart and hasattr(cart, 'user') else None,
                total_amount=payment.amount,
                shipping_cost=shipping_cost,
                status='pending',
                shipping_method=shipping_method or 'standard',
                shipping_address=shipping_address,
                billing_address=billing_address,
                customer_notes=customer_notes,
            )
            # Link payment to created order
            payment.order = order
            payment.save(update_fields=['order'])
            # Expose order id to frontend
            response_data['order_id'] = order.id
        except Exception as e:
            logger.exception('Failed to create provisional Order after payment initiation')
            # If order creation fails, surface an error so frontend does not navigate with NaN
            return Response({'error': 'failed_to_create_order', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(response_data)

    except Exception as e:
        logger.exception('Error initiating payment')
        return Response({'error': f'Failed to initiate payment: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def paysuite_webhook(request):
    """Endpoint to receive Paysuite callbacks/webhooks"""
    try:
        from .payments.paysuite import PaysuiteClient
        client = PaysuiteClient()

        payload = request.body
        # Per docs: 'X-Webhook-Signature' carries HMAC-SHA256 of raw body
        signature = (
            request.headers.get('X-Webhook-Signature')
            or request.headers.get('X-Paysuite-Signature')
            or request.headers.get('X-Signature')
        )

        # Verify signature when possible (best-effort; adjust to Paysuite docs)
        # If no secret/signature is configured, skip verification but log a warning
        if signature and (client.webhook_secret or client.api_secret):
            if not client.verify_signature(payload, signature):
                logger.warning('Paysuite webhook signature verification failed')
                return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            logger.warning('Paysuite webhook without signature verification (missing secret or header)')

        # DRF provides parsed data in request.data; keep raw body for signature
        data = request.data
        # Docs structure: { event: 'payment.success'|'payment.failed', data: { id, amount, reference, ... } }
        event_name = data.get('event')
        data_block = data.get('data') if isinstance(data.get('data'), dict) else {}

        # Find payment by external id or reference
        reference = data_block.get('id') or data_block.get('reference')
        logger.info(f"Paysuite webhook received: event={event_name} reference={reference}")
        from .models import Payment, Order
        payment = None
        if reference:
            payment = Payment.objects.filter(paysuite_reference=reference).first()

        # If not found, try by metadata order_id
        if not payment:
            metadata = data.get('metadata') if isinstance(data.get('metadata'), dict) else {}
            order_id = metadata.get('order_id')
            if order_id:
                payment = Payment.objects.filter(order__id=order_id).first()

        if not payment:
            logger.warning('Paysuite webhook: payment not found for payload')
            return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

        # Update payment status based on event name
        if event_name == 'payment.success':
            payment.status = 'paid'
        elif event_name == 'payment.failed':
            payment.status = 'failed'
        else:
            payment.status = 'pending'

        payment.raw_response = data
        payment.save(update_fields=['status', 'raw_response'])

        # If payment succeeded, ensure an Order is created from the saved request_data
        if payment.status == 'paid':
            from .stock_management import OrderManager
            from .models import Order

            order = payment.order
            # If no order exists yet, create it now from payment.request_data
            if not order:
                try:
                    rd = payment.request_data or {}
                    shipping_address = rd.get('shipping_address') or {}
                    billing_address = rd.get('billing_address') or shipping_address
                    shipping_method = rd.get('shipping_method') or rd.get('shipping_method', 'standard')
                    customer_notes = rd.get('customer_notes') or ''
                    shipping_cost = Decimal(str(rd.get('shipping_cost') or '0'))

                    order = Order.objects.create(
                        cart=payment.cart,
                        user=payment.cart.user if payment.cart and payment.cart.user else None,
                        total_amount=payment.amount,
                        shipping_cost=shipping_cost,
                        status='pending',
                        shipping_method=shipping_method,
                        shipping_address=shipping_address,
                        billing_address=billing_address,
                        customer_notes=customer_notes
                    )
                    # Link payment to the newly created order
                    payment.order = order
                    payment.save(update_fields=['order'])
                    logger.info(f'Created Order {order.id} from payment {payment.id} on webhook')
                    # Create OrderItem entries so admins know what to ship
                    try:
                        from .models import OrderItem

                        # Prefer items included in the original request payload if present
                        items_payload = None
                        rd_meta = rd.get('meta') if isinstance(rd, dict) else None
                        if isinstance(rd_meta, dict):
                            # Some clients may put items under rd['meta']['items'] or rd['items']
                            items_payload = rd_meta.get('items') or rd.get('items')
                        else:
                            items_payload = rd.get('items')

                        if items_payload and isinstance(items_payload, list):
                            for it in items_payload:
                                try:
                                    product = None
                                    color = None
                                    qty = int(it.get('quantity') or it.get('qty') or 1)
                                    unit_price = Decimal(str(it.get('price') or it.get('unit_price') or 0))

                                    pid = it.get('product_id') or it.get('id') or it.get('product')
                                    if pid:
                                        try:
                                            product = Product.objects.get(id=pid)
                                        except Exception:
                                            product = None

                                    cid = it.get('color_id') or it.get('color')
                                    if cid:
                                        try:
                                            color = Color.objects.get(id=cid)
                                        except Exception:
                                            color = None

                                    name = it.get('name') or (product.name if product else '')
                                    sku = getattr(product, 'sku', '') if product else (it.get('sku') or '')
                                    line_total = (unit_price * qty)

                                    OrderItem.objects.create(
                                        order=order,
                                        product=product,
                                        product_name=name,
                                        sku=sku,
                                        color=color,
                                        color_name=getattr(color, 'name', '') if color else (it.get('color_name') or ''),
                                        quantity=qty,
                                        unit_price=unit_price,
                                        line_total=line_total
                                    )
                                except Exception:
                                    logger.exception('Failed to create OrderItem from payload item')
                        else:
                            # Fallback: create items from the cart snapshot
                            if payment.cart:
                                for ci in payment.cart.items.select_related('product', 'color').all():
                                    try:
                                        qty = ci.quantity
                                        unit_price = ci.price
                                        line_total = unit_price * qty
                                        OrderItem.objects.create(
                                            order=order,
                                            product=ci.product,
                                            product_name=ci.product.name if ci.product else '',
                                            sku=getattr(ci.product, 'sku', ''),
                                            color=ci.color,
                                            color_name=ci.color.name if ci.color else '',
                                            quantity=qty,
                                            unit_price=unit_price,
                                            line_total=line_total
                                        )
                                    except Exception:
                                        logger.exception('Failed to create OrderItem from cart item')
                    except Exception:
                        logger.exception('Error creating order items')
                except Exception as e:
                    logger.exception(f'Failed to create Order from payment {payment.id}: {e}')

            # Proceed to update order status and stock
            if order:
                try:
                    OrderManager.update_order_status(
                        order=order,
                        new_status='paid',
                        user=None,  # Webhook - no specific user
                        notes=f"Pagamento confirmado via webhook - {event_name}"
                    )
                    logger.info(f"Order {order.order_number} marked as paid and stock reduced")
                except Exception as e:
                    logger.error(f"Error updating order status after payment: {e}")

                # Clear the cart after successful payment
                try:
                    cart = order.cart or payment.cart
                    if cart and cart.status == 'active':
                        # Clear all cart items
                        cart.items.all().delete()
                        # Mark cart as converted
                        cart.status = 'converted'
                        cart.save(update_fields=['status'])

                        # Log the cart clearing
                        CartHistory.objects.create(
                            cart=cart,
                            event='cart_cleared_after_payment',
                            description=f'Cart cleared after successful payment for order {order.id}',
                            metadata={'order_id': order.id, 'payment_id': payment.id}
                        )
                        logger.info(f'Cart {cart.id} cleared after successful payment for order {order.id}')
                except Exception as e:
                    logger.error(f'Error clearing cart after payment: {str(e)}')

        return Response({'ok': True})

    except Exception as e:
        logger.exception('Error handling paysuite webhook')
        return Response({'error': 'Webhook handling failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_status(request, order_id: int):
    """Simple endpoint to fetch an order and its payments for status polling."""
    try:
        from .models import Order, Payment
        from .serializers import OrderSerializer, PaymentSerializer

        order = get_object_or_404(Order, id=order_id, user=request.user)
        payments = Payment.objects.filter(order=order).order_by('-created_at')

        return Response({
            'order': OrderSerializer(order).data,
            'payments': PaymentSerializer(payments, many=True).data,
        })
    except Exception:
        logger.exception('Error fetching payment status')
        return Response({'error': 'Failed to fetch payment status'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def debug_fix_all_cart_prices(request):
    """Debug endpoint to fix all cart item prices to match current product prices"""
    try:
        fixed_carts = 0
        fixed_items = 0
        
        # Get all active carts
        active_carts = Cart.objects.filter(status='active').prefetch_related('items__product')
        
        for cart in active_carts:
            cart_fixed = False
            for item in cart.items.all():
                if item.product and item.product.status == 'active':
                    old_price = item.price
                    new_price = item.product.price
                    if old_price != new_price:
                        logger.info(f"🔧 FIXING CART {cart.id}: {item.product.name} {old_price} -> {new_price}")
                        item.price = new_price
                        item.save(update_fields=['price', 'updated_at'])
                        fixed_items += 1
                        cart_fixed = True
            
            if cart_fixed:
                cart.calculate_totals()
                fixed_carts += 1
                
        return Response({
            'message': f'Fixed prices in {fixed_carts} carts, updated {fixed_items} items',
            'fixed_carts': fixed_carts,
            'fixed_items': fixed_items
        })
        
    except Exception as e:
        logger.error(f"Error fixing cart prices: {str(e)}")
        return Response({'error': 'Failed to fix cart prices'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def debug_set_low_prices(request):
    """Debug endpoint to set all products to low prices for easy testing"""
    try:
        from products.models import Product
        from decimal import Decimal
        
        target_price = Decimal(request.data.get('price'))  # Use provided price, no default
        
        # Update all active products to the target price
        updated = Product.objects.filter(status='active').update(price=target_price)
        
        return Response({
            'message': f'Updated {updated} products to price {target_price} MZN',
            'updated_count': updated,
            'new_price': str(target_price)
        })
        
    except Exception as e:
        logger.error(f"Error setting low prices: {str(e)}")
        return Response({'error': 'Failed to set low prices'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def debug_list_carts(request):
    """Debug endpoint to list all carts"""
    try:
        from django.contrib.auth.models import User
        
        # Get all carts with their totals
        carts = Cart.objects.all().order_by('-updated_at')[:20]  # Last 20 carts
        
        cart_data = []
        for cart in carts:
            cart_info = {
                'id': cart.id,
                'user': cart.user.username if cart.user else 'Anonymous',
                'session_key': cart.session_key[:8] if cart.session_key else None,
                'status': cart.status,
                'total': str(cart.total),
                'items_count': cart.items.count(),
                'updated_at': cart.updated_at.isoformat(),
                'items': []
            }
            
            for item in cart.items.all():
                cart_info['items'].append({
                    'product_name': item.product.name,
                    'quantity': item.quantity,
                    'price': str(item.price),
                    'total': str(item.get_total_price())
                })
            
            cart_data.append(cart_info)
        
        return Response({
            'total_carts': Cart.objects.count(),
            'active_carts': Cart.objects.filter(status='active').count(),
            'recent_carts': cart_data
        })
        
    except Exception as e:
        logger.error(f"Error listing debug carts: {str(e)}")
        return Response({'error': 'Failed to list carts'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def debug_clear_carts(request):
    """Debug endpoint to clear all carts for a user or all active carts"""
    try:
        username = request.data.get('username')
        clear_all = request.data.get('clear_all', False)
        
        if clear_all:
            # Clear ALL active carts
            active_carts = Cart.objects.filter(status='active')
            count = active_carts.count()
            
            for cart in active_carts:
                cart.items.all().delete()
                cart.status = 'expired'
                cart.save()
                
                CartHistory.objects.create(
                    cart=cart,
                    event='debug_all_carts_cleared',
                    description=f'All carts cleared via debug endpoint',
                    metadata={'cleared_by': 'debug_endpoint_all'}
                )
            
            return Response({
                'message': f'Cleared {count} active carts (all users)',
                'carts_cleared': count
            })
        
        elif username:
            # Clear carts for specific user
            from django.contrib.auth.models import User
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={'email': f'{username}@test.com'}
            )
            
            active_carts = Cart.objects.filter(user=user, status='active')
            count = active_carts.count()
            
            for cart in active_carts:
                cart.items.all().delete()
                cart.status = 'expired'
                cart.save()
                
                CartHistory.objects.create(
                    cart=cart,
                    event='debug_cart_cleared',
                    description=f'Cart cleared via debug endpoint',
                    metadata={'cleared_by': 'debug_endpoint'}
                )
            
            return Response({
                'message': f'Cleared {count} active carts for user {username}',
                'carts_cleared': count
            })
        
        else:
            return Response({'error': 'Provide username or set clear_all=true'}, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error clearing debug carts: {str(e)}")
        return Response({'error': 'Failed to clear carts'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def debug_add_to_cart(request):
    """Debug endpoint to quickly add items to cart for testing"""
    try:
        # Use dev bypass for quick testing
        username = request.data.get('username', 'test-uid')
        # Use specified product or default to original laptop
        product_id = request.data.get('product_id', 21)  # Default to original product
        
        from django.contrib.auth.models import User
        user, _ = User.objects.get_or_create(
            username=username,
            defaults={'email': f'{username}@test.com'}
        )
        
        from decimal import Decimal
        
        # Get or create cart (only active status)
        cart, created = Cart.objects.get_or_create(
            user=user,
            status='active',
            defaults={'subtotal': Decimal('0.00'), 'total': Decimal('0.00')}
        )
        
        if created:
            logger.info(f'Created new cart {cart.id} for user {username}')
        else:
            logger.info(f'Using existing cart {cart.id} for user {username} - Total: {cart.total}')
            
        # Clear existing items to ensure fresh pricing
        if not created and cart.items.exists():
            logger.info(f'Clearing existing items from cart {cart.id} to refresh pricing')
            cart.items.all().delete()
            cart.subtotal = Decimal('0.00')
            cart.total = Decimal('0.00')
            cart.save(update_fields=['subtotal', 'total'])
        
        # Add product
        product = get_object_or_404(Product, id=product_id, status='active')
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': 1, 'price': product.price}
        )
        
        if not created:
            cart_item.quantity += 1
            cart_item.save()
        
        cart.calculate_totals()
        
        return Response({
            'message': 'Item added to cart',
            'user': username,
            'cart_items': cart.items.count(),
            'total': str(cart.total)
        })
        
    except Exception as e:
        logger.exception('Error in debug add to cart')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


