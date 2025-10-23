from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from rest_framework import status
import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from customers.views import IsAdmin
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from products.models import Product, Color
from .models import Cart, CartItem, Coupon, CartHistory, AbandonedCart, CouponUsage
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
            warnings = []
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
                        warnings.append({'type': 'product_not_found', 'product_id': product_id})
                        continue
                        
                    if product.stock_quantity is not None and quantity > product.stock_quantity:
                        warnings.append({
                            'type': 'quantity_adjusted',
                            'product_id': product.id,
                            'sent_quantity': quantity,
                            'adjusted_quantity': product.stock_quantity
                        })
                        quantity = product.stock_quantity

                    color = None
                    if color_id:
                        try:
                            color = Color.objects.get(id=color_id, is_active=True)
                        except Color.DoesNotExist:
                            warnings.append({'type': 'color_not_found', 'product_id': product.id, 'color_id': color_id})
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
        # Merge warnings into response while keeping cart shape compatible
        cart_data = serializer.data
        if isinstance(cart_data, dict):
            cart_data = {**cart_data, 'warnings': warnings}
            return Response(cart_data)
        return Response({'warnings': warnings, 'cart': cart_data})

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
        # Priority: 1) URL param, 2) User's cart, 3) None
        cart_total_param = request.GET.get('cart_total')
        if cart_total_param:
            try:
                cart_total = Decimal(cart_total_param)
            except (ValueError, TypeError):
                cart_total = None
        else:
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
        import traceback
        logger.error(f"Error validating coupon: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response(
            {'error': 'Failed to validate coupon', 'detail': str(e)},
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

        # Apply coupon if provided by client
        coupon_code = request.data.get('coupon_code')
        discount_amount = Decimal('0.00')
        applied_coupon = None
        
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code, is_active=True)
                user = request.user if request.user.is_authenticated else None
                cart_subtotal = cart.subtotal or Decimal('0.00')
                
                if coupon.is_valid(user=user, cart_total=cart_subtotal):
                    discount_amount = coupon.calculate_discount(cart_subtotal)
                    applied_coupon = coupon
                    logger.info(f"✅ Coupon {coupon_code} applied: discount={discount_amount} on cart_subtotal={cart_subtotal}")
                    
                    # Update cart with applied coupon for tracking
                    cart.applied_coupon = coupon
                    cart.discount_amount = discount_amount
                    cart.save(update_fields=['applied_coupon', 'discount_amount'])
                    
                    # Record coupon usage
                    try:
                        CouponUsage.objects.create(coupon=coupon, user=user, order=None)
                    except Exception as e:
                        logger.warning(f"Could not create CouponUsage: {e}")
                else:
                    logger.warning(f"⚠️ Coupon {coupon_code} is not valid for this cart")
            except Coupon.DoesNotExist:
                logger.warning(f"⚠️ Coupon {coupon_code} not found or inactive")
            except Exception as e:
                logger.error(f"❌ Error applying coupon {coupon_code}: {e}")
        
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

        # Calculate charge total with discount applied
        cart_subtotal = cart.subtotal or Decimal('0.00')
        charge_total = cart_subtotal - discount_amount + shipping_dec
        
        # Ensure charge_total is never negative
        if charge_total < 0:
            charge_total = Decimal('0.00')

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

        # Persist contact details to CustomerProfile for authenticated users
        try:
            if request.user and request.user.is_authenticated and isinstance(shipping_address, dict):
                from customers.models import CustomerProfile  # local import to avoid cycles
                profile, _ = CustomerProfile.objects.get_or_create(user=request.user, defaults={'status': 'active'})
                # Update profile fields if provided
                updated = False
                for field in ['phone', 'address', 'city', 'province', 'postal_code']:
                    if shipping_address.get(field) is not None and getattr(profile, field) != shipping_address.get(field):
                        setattr(profile, field, shipping_address.get(field) or '')
                        updated = True
                if updated:
                    profile.save()

                # Update user first/last name from 'name'
                full_name = shipping_address.get('name')
                user_changed = False
                if isinstance(full_name, str) and full_name.strip():
                    parts = full_name.strip().split()
                    first_name = parts[0] if len(parts) > 0 else ''
                    last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
                    if request.user.first_name != first_name or request.user.last_name != last_name:
                        request.user.first_name = first_name
                        request.user.last_name = last_name
                        user_changed = True
                # Update user email from shipping_address.email if present
                email_val = shipping_address.get('email')
                if isinstance(email_val, str) and email_val and email_val != request.user.email:
                    request.user.email = email_val
                    user_changed = True
                if user_changed:
                    request.user.save(update_fields=['first_name', 'last_name', 'email'])
        except Exception:
            # Do not block checkout on profile persistence errors
            logger.warning('Failed to persist shipping address to CustomerProfile (non-fatal)')

        # Payment method and data requested
        method = request.data.get('method', 'mpesa')
        payment_data = request.data

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

        # Prepare cart items data for order creation in webhook
        cart_items_data = []
        for cart_item in cart.items.select_related('product', 'color').all():
            # Get product image URL
            product_image_url = ''
            if cart_item.product:
                if hasattr(cart_item.product, 'images') and cart_item.product.images.exists():
                    first_image = cart_item.product.images.first()
                    if first_image and hasattr(first_image, 'image') and first_image.image:
                        product_image_url = request.build_absolute_uri(first_image.image.url)
            
            item_data = {
                'product_id': cart_item.product.id if cart_item.product else None,
                'product': cart_item.product.id if cart_item.product else None,
                'name': cart_item.product.name if cart_item.product else '',
                'sku': getattr(cart_item.product, 'sku', '') if cart_item.product else '',
                'product_image': product_image_url,
                'color_id': cart_item.color.id if cart_item.color else None,
                'color': cart_item.color.id if cart_item.color else None,
                'color_name': cart_item.color.name if cart_item.color else '',
                'quantity': cart_item.quantity,
                'price': str(cart_item.price),
                'unit_price': str(cart_item.price),
            }
            cart_items_data.append(item_data)
        
        # Log cart items for debugging
        logger.info(f"💾 Saving {len(cart_items_data)} items to payment.request_data for cart {cart.id}")

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
                'items': cart_items_data,  # Include cart items for order creation in webhook
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
            # Pass credentials explicitly from settings to ensure they're loaded
            client = PaysuiteClient(
                base_url=settings.PAYSUITE_BASE_URL,
                api_key=settings.PAYSUITE_API_KEY,
                webhook_secret=settings.PAYSUITE_WEBHOOK_SECRET
            )
        # Correct API path for webhook lives under /api/cart/
        # Use WEBHOOK_BASE_URL from settings if configured, otherwise use request host
        
        if hasattr(settings, 'WEBHOOK_BASE_URL') and settings.WEBHOOK_BASE_URL:
            # Use configured webhook base URL (for ngrok or production)
            callback_url = f"{settings.WEBHOOK_BASE_URL.rstrip('/')}/api/cart/payments/webhook/"
            return_url = f"{settings.WEBHOOK_BASE_URL.rstrip('/')}/orders/status"
            logger.info(f"🔔 Using configured WEBHOOK_BASE_URL: {settings.WEBHOOK_BASE_URL}")
        else:
            # Fallback to request host (default behavior)
            callback_url = request.build_absolute_uri('/api/cart/payments/webhook/')
            return_url = request.build_absolute_uri(f'/orders/status')
            logger.info(f"🔔 Using request host for webhook: {callback_url}")
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

        # ========================================
        # 🚨 CRÍTICO: NÃO criar Order aqui!
        # Order só deve ser criado APÓS confirmação de pagamento (paid)
        # via webhook ou polling para evitar pedidos falsos.
        # ========================================
        # O payment já foi criado com cart vinculado e request_data salvo.
        # O webhook/polling criará o Order quando status = 'paid'.
        
        # Frontend precisa de um ID para acompanhar status
        # Usamos payment.id como referência temporária
        response_data['payment_id'] = payment.id
        logger.info(f"💳 Payment {payment.id} criado sem Order. Order será criado apenas quando status='paid'")

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
        # Entry diagnostics
        try:
            meta = request.META
            ip = meta.get('HTTP_X_FORWARDED_FOR', meta.get('REMOTE_ADDR', 'unknown')).split(',')[0].strip()
            ua = meta.get('HTTP_USER_AGENT', 'unknown')
            clen = meta.get('CONTENT_LENGTH', '0')
            logger.info(f"📥 Paysuite webhook hit: ip={ip}, ua={ua[:80]}, content_length={clen}")
        except Exception:
            logger.debug("Could not log request meta for webhook")
        # Per docs: 'X-Webhook-Signature' carries HMAC-SHA256 of raw body
        signature = (
            request.headers.get('X-Webhook-Signature')
            or request.headers.get('X-Paysuite-Signature')
            or request.headers.get('X-Signature')
        )
        if signature:
            logger.info(f"🧪 Webhook signature header present: {signature[:12]}… (len={len(signature)})")
        else:
            logger.warning("⚠️ Webhook without signature header")

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
        # Accept both 'payment.success' and 'payment.paid' (different PaySuite versions)
        old_payment_status = payment.status
        if event_name in ['payment.success', 'payment.paid', 'payment.completed']:
            payment.status = 'paid'
        elif event_name in ['payment.failed', 'payment.cancelled', 'payment.rejected']:
            payment.status = 'failed'
        else:
            payment.status = 'pending'

        payment.raw_response = data
        payment.save(update_fields=['status', 'raw_response'])
        
        logger.info(f"🔔 Webhook received: event={event_name}, payment_id={payment.id}, status: {old_payment_status} → {payment.status}, reference={reference}")

        # CRITICAL: Sync order.status with payment.status immediately
        # This ensures frontend polling gets updated status even if OrderManager fails
        if payment.order:
            old_order_status = payment.order.status
            payment.order.status = payment.status
            payment.order.save(update_fields=['status'])
            logger.info(f"✅ Synced order {payment.order.id} status: {old_order_status} → {payment.status}")

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
                        
                        logger.info(f"📦 Webhook creating order items: found {len(items_payload) if items_payload else 0} items in request_data")

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
                                    
                                    # Get product image - prefer from payload, fallback to product
                                    product_image = it.get('product_image', '')
                                    if not product_image and product:
                                        if hasattr(product, 'images') and product.images.exists():
                                            first_image = product.images.first()
                                            if first_image and hasattr(first_image, 'image'):
                                                product_image = request.build_absolute_uri(first_image.image.url) if first_image.image else ''
                                    
                                    # Get color hex
                                    color_hex = getattr(color, 'hex_code', '') if color else ''
                                    
                                    logger.info(f"  ✅ Creating OrderItem: {name} (SKU: {sku}, Image: {'Yes' if product_image else 'No'})")

                                    OrderItem.objects.create(
                                        order=order,
                                        product=product,
                                        product_name=name,
                                        sku=sku,
                                        product_image=product_image,
                                        color=color,
                                        color_name=getattr(color, 'name', '') if color else (it.get('color_name') or ''),
                                        color_hex=color_hex,
                                        quantity=qty,
                                        unit_price=unit_price,
                                        subtotal=line_total,
                                        weight=getattr(product, 'weight', None) if product else None,
                                        dimensions=getattr(product, 'dimensions', '') if product else ''
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
                                        
                                        # Get product image
                                        product_image = ''
                                        if ci.product:
                                            if hasattr(ci.product, 'images') and ci.product.images.exists():
                                                first_image = ci.product.images.first()
                                                if first_image and hasattr(first_image, 'image'):
                                                    product_image = request.build_absolute_uri(first_image.image.url) if first_image.image else ''
                                        
                                        OrderItem.objects.create(
                                            order=order,
                                            product=ci.product,
                                            product_name=ci.product.name if ci.product else '',
                                            sku=getattr(ci.product, 'sku', ''),
                                            product_image=product_image,
                                            color=ci.color,
                                            color_name=ci.color.name if ci.color else '',
                                            color_hex=getattr(ci.color, 'hex_code', '') if ci.color else '',
                                            quantity=qty,
                                            unit_price=unit_price,
                                            subtotal=line_total,
                                            weight=getattr(ci.product, 'weight', None) if ci.product else None,
                                            dimensions=getattr(ci.product, 'dimensions', '') if ci.product else ''
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
                    old_order_status = order.status
                    OrderManager.update_order_status(
                        order=order,
                        new_status='paid',
                        user=None,  # Webhook - no specific user
                        notes=f"Pagamento confirmado via webhook - {event_name}"
                    )
                    # Reload to get updated status
                    order.refresh_from_db()
                    logger.info(f"📦 Order {order.order_number} (id={order.id}) status updated: {old_order_status} → {order.status}, stock reduced")
                except Exception as e:
                    logger.error(f"❌ Error updating order status after payment: {e}")

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

                # ========================================
                # ENVIAR EMAILS DE NOTIFICAÇÃO
                # ========================================
                try:
                    logger.info(f"🚀 [WEBHOOK] Iniciando envio de emails para order {order.id}")
                    print(f"🚀 [WEBHOOK] Iniciando envio de emails para order {order.id}")
                    
                    from .email_service import get_email_service
                    email_service = get_email_service()
                    
                    # Email para o cliente: confirmação de pedido
                    customer_email = order.shipping_address.get('email', '')
                    customer_name = order.shipping_address.get('name', 'Cliente')
                    
                    logger.info(f"📬 [WEBHOOK] Customer email: {customer_email}, name: {customer_name}")
                    print(f"📬 [WEBHOOK] Customer email: {customer_email}, name: {customer_name}")
                    
                    if customer_email:
                        # Confirmação de pedido criado
                        logger.info(f"📧 [WEBHOOK] Enviando email de confirmação...")
                        result1 = email_service.send_order_confirmation(
                            order=order,
                            customer_email=customer_email,
                            customer_name=customer_name
                        )
                        logger.info(f"{'✅' if result1 else '❌'} [WEBHOOK] Email de confirmação: {result1}")
                        
                        # Status de pagamento aprovado
                        logger.info(f"📧 [WEBHOOK] Enviando email de status de pagamento...")
                        result2 = email_service.send_payment_status_update(
                            order=order,
                            payment_status='paid',
                            customer_email=customer_email,
                            customer_name=customer_name
                        )
                        logger.info(f"{'✅' if result2 else '❌'} [WEBHOOK] Email de status: {result2}")
                        
                        logger.info(f"📧 [WEBHOOK] Emails de confirmação enviados para {customer_email}")
                        print(f"📧 [WEBHOOK] Emails de confirmação enviados para {customer_email}")
                    else:
                        logger.warning(f"⚠️ [WEBHOOK] customer_email está vazio! Não é possível enviar emails.")
                        print(f"⚠️ [WEBHOOK] customer_email está vazio! Não é possível enviar emails.")
                    
                    # Email para o admin: nova venda
                    logger.info(f"📧 [WEBHOOK] Enviando email para admin...")
                    result3 = email_service.send_new_order_notification_to_admin(order=order)
                    logger.info(f"{'✅' if result3 else '❌'} [WEBHOOK] Email admin: {result3}")
                    logger.info(f"📧 [WEBHOOK] Email de nova venda enviado para admin")
                    print(f"📧 [WEBHOOK] Email de nova venda enviado para admin")
                    
                except Exception as e:
                    logger.error(f"❌ [WEBHOOK] Erro ao enviar emails de notificação: {e}")
                    print(f"❌ [WEBHOOK] Erro ao enviar emails de notificação: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
                    print(traceback.format_exc())
                # ========================================

        # ========================================
        # TRATAR PAGAMENTO FALHADO
        # ========================================
        elif payment.status == 'failed':
            logger.info(f"💔 Payment {payment.id} failed - sending failure notification")
            
            # Atualizar order para failed se existir
            if payment.order:
                try:
                    from .stock_management import OrderManager
                    OrderManager.update_order_status(
                        order=payment.order,
                        new_status='failed',
                        user=None,
                        notes=f"Pagamento falhou via webhook: {event_name}"
                    )
                except Exception as e:
                    logger.error(f"❌ Erro ao atualizar order para failed: {e}")
                    # Fallback: update directly
                    payment.order.status = 'failed'
                    payment.order.save(update_fields=['status'])
            
            # Enviar email de falha ao cliente
            try:
                from .email_service import get_email_service
                email_service = get_email_service()
                
                customer_email = None
                customer_name = 'Cliente'
                
                # Try to get customer email from order or payment
                if payment.order:
                    customer_email = payment.order.shipping_address.get('email', '')
                    customer_name = payment.order.shipping_address.get('name', 'Cliente')
                elif payment.request_data and isinstance(payment.request_data, dict):
                    # Try from saved cart data
                    customer_email = payment.request_data.get('customer_email', '')
                    customer_name = payment.request_data.get('customer_name', 'Cliente')
                
                if customer_email:
                    email_service.send_payment_status_update(
                        order=payment.order,
                        payment_status='failed',
                        customer_email=customer_email,
                        customer_name=customer_name
                    )
                    logger.info(f"📧 Email de falha enviado para {customer_email}")
                else:
                    logger.warning(f"⚠️ Não foi possível enviar email - customer_email não encontrado")
                    
            except Exception as e:
                logger.error(f"❌ Erro ao enviar email de falha: {e}")
        # ========================================

        return Response({'ok': True})

    except Exception as e:
        logger.exception('Error handling paysuite webhook')
        return Response({'error': 'Webhook handling failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_status(request, order_id: int):
    """Simple endpoint to fetch payment status for polling.
    
    Accepts order_id OR payment_id (backwards compatible).
    Also performs active polling to PaySuite API when payment is still pending,
    providing a fallback when webhooks don't arrive.
    """
    try:
        from .models import Order, Payment
        from .serializers import OrderSerializer, PaymentSerializer

        # Try to get Order first (existing flow)
        order = Order.objects.filter(id=order_id, user=request.user).first()
        
        if order:
            # Existing flow: order exists, get payments
            payments = Payment.objects.filter(order=order).order_by('-created_at')
            print(f"📊 [POLLING] Payment Status Poll: order_id={order_id}, order.status={order.status}, payment_count={payments.count()}")
            logger.info(f"📊 Payment Status Poll: order_id={order_id}, order.status={order.status}, payment_count={payments.count()}")
        else:
            # New flow: order doesn't exist yet, treat order_id as payment_id
            payment = Payment.objects.filter(id=order_id).first()
            if not payment:
                return Response({'error': 'Payment or order not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Verify user ownership via cart
            if payment.cart and payment.cart.user and payment.cart.user != request.user:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
            # Use QuerySet instead of list for consistency
            payments = Payment.objects.filter(id=payment.id)
            order = payment.order  # May be None if not yet created
            print(f"📊 [POLLING] Payment Status Poll: payment_id={order_id}, payment.status={payment.status}, order={'exists' if order else 'not yet created'}")
            logger.info(f"📊 Payment Status Poll: payment_id={order_id}, payment.status={payment.status}, order={'exists' if order else 'not yet created'}")
        
        # Active polling: if latest payment is pending, query PaySuite directly
        if payments.exists():
            latest_payment = payments.first()
            print(f"💳 [POLLING] Latest Payment: id={latest_payment.id}, status={latest_payment.status}, method={latest_payment.method}, ref={latest_payment.paysuite_reference}")
            logger.info(f"💳 Latest Payment: id={latest_payment.id}, status={latest_payment.status}, method={latest_payment.method}, ref={latest_payment.paysuite_reference}")
            
            # Only poll PaySuite if payment is pending and we have a reference
            if latest_payment.status == 'pending' and latest_payment.paysuite_reference:
                try:
                    from .payments.paysuite import PaysuiteClient
                    from django.conf import settings
                    from django.utils import timezone as tz  # Import with alias to avoid conflicts
                    
                    # CRITICAL: Pass credentials explicitly to ensure Authorization header is sent
                    client = PaysuiteClient(
                        base_url=settings.PAYSUITE_BASE_URL,
                        api_key=settings.PAYSUITE_API_KEY,
                        webhook_secret=settings.PAYSUITE_WEBHOOK_SECRET
                    )
                    
                    print(f"🔄 [POLLING] Active polling PaySuite for payment {latest_payment.paysuite_reference}")
                    logger.info(f"🔄 Active polling PaySuite for payment {latest_payment.paysuite_reference}")
                    paysuite_response = client.get_payment_status(latest_payment.paysuite_reference)
                    
                    print(f"🔍 [POLLING] PaySuite response received: {paysuite_response}")
                    print(f"🔍 [POLLING] Response status field: {paysuite_response.get('status')}")
                    
                    response_status = paysuite_response.get('status')
                    
                    if response_status == 'success':
                        paysuite_data = paysuite_response.get('data', {})
                        
                        print(f"✅ [POLLING] PaySuite data: {paysuite_data}")
                        
                        # PaySuite API returns:
                        # - transaction: null → payment still pending OR failed (ambiguous!)
                        # - transaction: {...} → payment completed successfully
                        # - error/message field → payment failed explicitly
                        transaction = paysuite_data.get('transaction')
                        error = paysuite_data.get('error') or paysuite_data.get('message')
                        
                        if transaction is not None:
                            # Transaction completed successfully
                            new_status = 'paid'
                            logger.info(f"✅ PaySuite transaction completed: {transaction}")
                            print(f"✅ [POLLING] Transaction completed: {transaction}")
                        elif error:
                            # Payment failed with explicit error
                            new_status = 'failed'
                            logger.info(f"❌ PaySuite payment failed: {error}")
                            print(f"❌ [POLLING] Payment failed: {error}")
                        else:
                            # Transaction is null - use hybrid timeout logic
                            payment_age_minutes = (tz.now() - latest_payment.created_at).total_seconds() / 60
                            
                            # Increment poll count
                            latest_payment.poll_count += 1
                            latest_payment.last_polled_at = tz.now()
                            latest_payment.save(update_fields=['poll_count', 'last_polled_at'])
                            
                            # Hybrid timeout logic:
                            # 1. Hard timeout: 15 minutes regardless of polls
                            # 2. Soft timeout: 3 minutes + 60 polls (likely failed, not just slow)
                            HARD_TIMEOUT_MINUTES = 15
                            SOFT_TIMEOUT_MINUTES = 3
                            SOFT_TIMEOUT_POLLS = 60  # 60 polls × 3s = 3 minutes of continuous polling
                            
                            should_timeout = False
                            timeout_reason = ""
                            
                            if payment_age_minutes > HARD_TIMEOUT_MINUTES:
                                should_timeout = True
                                timeout_reason = f"Hard timeout: {int(payment_age_minutes)} minutos sem confirmação"
                                logger.warning(f"⏰ [POLLING] Hard timeout: {payment_age_minutes:.1f} minutes old")
                                print(f"⏰ [POLLING] Hard timeout after {payment_age_minutes:.1f} minutes - marking as failed")
                            elif payment_age_minutes > SOFT_TIMEOUT_MINUTES and latest_payment.poll_count > SOFT_TIMEOUT_POLLS:
                                should_timeout = True
                                timeout_reason = f"Soft timeout: {int(payment_age_minutes)} minutos e {latest_payment.poll_count} tentativas sem sucesso"
                                logger.warning(f"⏰ [POLLING] Soft timeout: {payment_age_minutes:.1f} min + {latest_payment.poll_count} polls")
                                print(f"⏰ [POLLING] Soft timeout: {payment_age_minutes:.1f} min + {latest_payment.poll_count} polls - likely failed")
                            
                            if should_timeout:
                                new_status = 'failed'
                                error_msg = f'Pagamento expirado: {timeout_reason}'
                                
                                # Store timeout error in raw_response
                                latest_payment.raw_response = latest_payment.raw_response or {}
                                latest_payment.raw_response['polled_response'] = {
                                    'status': 'error',
                                    'message': error_msg,
                                    'code': 'PAYMENT_TIMEOUT',
                                    'polled_at': tz.now().isoformat(),
                                    'timeout_type': 'hard' if payment_age_minutes > HARD_TIMEOUT_MINUTES else 'soft',
                                    'age_minutes': payment_age_minutes,
                                    'poll_count': latest_payment.poll_count
                                }
                                latest_payment.raw_response['error_message'] = error_msg
                            else:
                                # Still within timeout window - keep as pending
                                new_status = 'pending'
                                logger.info(f"⏳ PaySuite payment still pending (age: {payment_age_minutes:.1f} min, polls: {latest_payment.poll_count})")
                                print(f"⏳ [POLLING] Payment still pending ({payment_age_minutes:.1f} min, {latest_payment.poll_count} polls, soft timeout at {SOFT_TIMEOUT_MINUTES} min + {SOFT_TIMEOUT_POLLS} polls)")
                        
                        print(f"🔄 [POLLING] Status mapping: Current={latest_payment.status}, New={new_status}")
                        
                        if new_status != latest_payment.status:
                            logger.info(f"🔄 Updating payment {latest_payment.id} from {latest_payment.status} to {new_status} based on PaySuite polling")
                            
                            # Update payment status
                            old_payment_status = latest_payment.status
                            latest_payment.status = new_status
                            # Store the polled response
                            latest_payment.raw_response = {
                                **latest_payment.raw_response,
                                'polled_at': tz.now().isoformat(),
                                'polled_response': paysuite_response
                            }
                            latest_payment.save(update_fields=['status', 'raw_response'])
                            
                            # Sync order status immediately
                            if latest_payment.order:
                                old_order_status = latest_payment.order.status
                                latest_payment.order.status = new_status
                                latest_payment.order.save(update_fields=['status'])
                                logger.info(f"✅ Synced order {latest_payment.order.id} status: {old_order_status} → {new_status} (via active polling)")
                            
                            # ========================================
                            # ENVIAR EMAILS APÓS ATUALIZAÇÃO VIA POLLING
                            # ========================================
                            if new_status == 'failed' and latest_payment.order:
                                # Send failure notification email
                                try:
                                    logger.info(f"🚀 [POLLING-FAILED] Iniciando envio de email de falha para order {latest_payment.order.id}")
                                    print(f"🚀 [POLLING-FAILED] Iniciando envio de email de falha para order {latest_payment.order.id}")
                                    
                                    from .email_service import get_email_service
                                    email_service = get_email_service()
                                    
                                    customer_email = latest_payment.order.shipping_address.get('email', '')
                                    customer_name = latest_payment.order.shipping_address.get('name', 'Cliente')
                                    
                                    logger.info(f"📬 [POLLING-FAILED] Customer email: {customer_email}, name: {customer_name}")
                                    print(f"📬 [POLLING-FAILED] Customer email: {customer_email}, name: {customer_name}")
                                    
                                    if customer_email:
                                        logger.info(f"📧 [POLLING-FAILED] Enviando email de falha...")
                                        result = email_service.send_payment_status_update(
                                            order=latest_payment.order,
                                            payment_status='failed',
                                            customer_email=customer_email,
                                            customer_name=customer_name
                                        )
                                        logger.info(f"{'✅' if result else '❌'} [POLLING-FAILED] Email de falha: {result}")
                                        print(f"{'✅' if result else '❌'} [POLLING-FAILED] Email de falha: {result}")
                                        logger.info(f"📧 [POLLING] Email de falha enviado para {customer_email}")
                                        print(f"📧 [POLLING] Email de falha enviado para {customer_email}")
                                    else:
                                        logger.warning(f"⚠️ [POLLING-FAILED] customer_email está vazio!")
                                        print(f"⚠️ [POLLING-FAILED] customer_email está vazio!")
                                except Exception as e:
                                    logger.error(f"❌ [POLLING] Erro ao enviar email de falha: {e}")
                                    print(f"❌ [POLLING] Erro ao enviar email de falha: {e}")
                                    import traceback
                                    logger.error(traceback.format_exc())
                                    print(traceback.format_exc())
                            # ========================================
                            
                            # If payment succeeded, CREATE ORDER if it doesn't exist yet
                            if new_status == 'paid' and not latest_payment.order:
                                try:
                                    logger.info(f"🔧 [POLLING] Order doesn't exist - creating order for payment {latest_payment.id}")
                                    print(f"🔧 [POLLING] Creating Order for payment {latest_payment.id}")
                                    
                                    # Get cart and request data
                                    cart = latest_payment.cart
                                    rd = latest_payment.request_data or {}
                                    
                                    if not cart:
                                        logger.error(f"❌ [POLLING] No cart found for payment {latest_payment.id}")
                                        raise Exception("No cart found for payment")
                                    
                                    # Extract order data from request_data
                                    shipping_address = rd.get('shipping_address', {})
                                    shipping_method = rd.get('shipping_method', 'standard')  # 'standard' is default
                                    shipping_cost = Decimal(str(rd.get('shipping_cost', 0)))
                                    customer_notes = rd.get('customer_notes', '')
                                    
                                    # Create Order
                                    from .models import Order
                                    order = Order.objects.create(
                                        cart=cart,
                                        user=cart.user,
                                        total_amount=latest_payment.amount,
                                        shipping_cost=shipping_cost,
                                        status='paid',  # Already paid!
                                        shipping_address=shipping_address,
                                        shipping_method=shipping_method,
                                        customer_notes=customer_notes
                                    )
                                    
                                    # Link payment to order
                                    latest_payment.order = order
                                    latest_payment.save(update_fields=['order'])
                                    
                                    logger.info(f"✅ [POLLING] Order {order.order_number} created for payment {latest_payment.id}")
                                    print(f"✅ [POLLING] Order {order.order_number} created!")
                                    
                                except Exception as e:
                                    logger.error(f"❌ [POLLING] Error creating order: {e}")
                                    print(f"❌ [POLLING] Error creating order: {e}")
                                    import traceback
                                    logger.error(traceback.format_exc())
                                    print(traceback.format_exc())
                            
                            # If payment succeeded, trigger the full order completion flow
                            if new_status == 'paid':
                                from .stock_management import OrderManager
                                from .models import OrderItem
                                try:
                                    # CRITICAL: Create OrderItems if they don't exist (webhook fallback)
                                    if latest_payment.order and not latest_payment.order.items.exists():
                                        logger.info(f"🔧 Creating OrderItems via polling for order {latest_payment.order.id}")
                                        
                                        # Get items from payment.request_data
                                        rd = latest_payment.request_data or {}
                                        items_payload = rd.get('items', [])
                                        
                                        if items_payload:
                                            logger.info(f"📦 Found {len(items_payload)} items in payment.request_data")
                                            for it in items_payload:
                                                try:
                                                    product = None
                                                    color = None
                                                    qty = int(it.get('quantity', 1))
                                                    unit_price = Decimal(str(it.get('unit_price') or it.get('price', 0)))
                                                    
                                                    pid = it.get('product_id') or it.get('product')
                                                    if pid:
                                                        try:
                                                            product = Product.objects.get(id=pid)
                                                        except Exception:
                                                            pass
                                                    
                                                    cid = it.get('color_id') or it.get('color')
                                                    if cid:
                                                        try:
                                                            color = Color.objects.get(id=cid)
                                                        except Exception:
                                                            pass
                                                    
                                                    product_image = it.get('product_image', '')
                                                    color_hex = getattr(color, 'hex_code', '') if color else ''
                                                    
                                                    OrderItem.objects.create(
                                                        order=latest_payment.order,
                                                        product=product,
                                                        product_name=it.get('name', ''),
                                                        sku=it.get('sku', ''),
                                                        product_image=product_image,
                                                        color=color,
                                                        color_name=it.get('color_name', ''),
                                                        color_hex=color_hex,
                                                        quantity=qty,
                                                        unit_price=unit_price,
                                                        subtotal=unit_price * qty,
                                                        weight=getattr(product, 'weight', None) if product else None,
                                                        dimensions=getattr(product, 'dimensions', '') if product else ''
                                                    )
                                                    logger.info(f"✅ Created OrderItem: {it.get('name', 'Product')}")
                                                except Exception as e:
                                                    logger.exception(f"❌ Failed to create OrderItem: {e}")
                                        else:
                                            # Fallback: try to get from cart
                                            cart = latest_payment.cart
                                            if cart and cart.items.exists():
                                                logger.info(f"🛒 Fallback: creating items from cart {cart.id}")
                                                for ci in cart.items.select_related('product', 'color').all():
                                                    try:
                                                        product_image = ''
                                                        if ci.product and hasattr(ci.product, 'images') and ci.product.images.exists():
                                                            first_image = ci.product.images.first()
                                                            if first_image and hasattr(first_image, 'image') and first_image.image:
                                                                product_image = request.build_absolute_uri(first_image.image.url)
                                                        
                                                        OrderItem.objects.create(
                                                            order=latest_payment.order,
                                                            product=ci.product,
                                                            product_name=ci.product.name if ci.product else '',
                                                            sku=getattr(ci.product, 'sku', ''),
                                                            product_image=product_image,
                                                            color=ci.color,
                                                            color_name=ci.color.name if ci.color else '',
                                                            color_hex=getattr(ci.color, 'hex_code', '') if ci.color else '',
                                                            quantity=ci.quantity,
                                                            unit_price=ci.price,
                                                            subtotal=ci.price * ci.quantity,
                                                            weight=getattr(ci.product, 'weight', None) if ci.product else None,
                                                            dimensions=getattr(ci.product, 'dimensions', '') if ci.product else ''
                                                        )
                                                        logger.info(f"✅ Created OrderItem from cart: {ci.product.name if ci.product else 'Product'}")
                                                    except Exception as e:
                                                        logger.exception(f"❌ Failed to create OrderItem from cart: {e}")
                                    
                                    OrderManager.update_order_status(
                                        order=latest_payment.order,
                                        new_status='paid',
                                        user=None,
                                        notes="Pagamento confirmado via polling ativo da API PaySuite"
                                    )
                                    logger.info(f"📦 Order {latest_payment.order.order_number} processed via active polling")
                                    
                                    # ========================================
                                    # ENVIAR EMAILS DE CONFIRMAÇÃO (PAID VIA POLLING)
                                    # ========================================
                                    try:
                                        logger.info(f"🚀 [POLLING] Iniciando envio de emails para order {latest_payment.order.id}")
                                        print(f"🚀 [POLLING] Iniciando envio de emails para order {latest_payment.order.id}")
                                        
                                        from .email_service import get_email_service
                                        email_service = get_email_service()
                                        
                                        customer_email = latest_payment.order.shipping_address.get('email', '')
                                        customer_name = latest_payment.order.shipping_address.get('name', 'Cliente')
                                        
                                        logger.info(f"📬 [POLLING] Customer email: {customer_email}, name: {customer_name}")
                                        print(f"📬 [POLLING] Customer email: {customer_email}, name: {customer_name}")
                                        
                                        if customer_email:
                                            # Email de confirmação de pedido
                                            logger.info(f"📧 [POLLING] Enviando email de confirmação...")
                                            result1 = email_service.send_order_confirmation(
                                                order=latest_payment.order,
                                                customer_email=customer_email,
                                                customer_name=customer_name
                                            )
                                            logger.info(f"{'✅' if result1 else '❌'} [POLLING] Email de confirmação: {result1}")
                                            print(f"{'✅' if result1 else '❌'} [POLLING] Email de confirmação: {result1}")
                                            
                                            # Email de status de pagamento
                                            logger.info(f"📧 [POLLING] Enviando email de status de pagamento...")
                                            result2 = email_service.send_payment_status_update(
                                                order=latest_payment.order,
                                                payment_status='paid',
                                                customer_email=customer_email,
                                                customer_name=customer_name
                                            )
                                            logger.info(f"{'✅' if result2 else '❌'} [POLLING] Email de status: {result2}")
                                            print(f"{'✅' if result2 else '❌'} [POLLING] Email de status: {result2}")
                                            
                                            logger.info(f"📧 [POLLING] Emails de confirmação enviados para {customer_email}")
                                            print(f"📧 [POLLING] Emails de confirmação enviados para {customer_email}")
                                        else:
                                            logger.warning(f"⚠️ [POLLING] customer_email está vazio! Não é possível enviar emails.")
                                            print(f"⚠️ [POLLING] customer_email está vazio! Não é possível enviar emails.")
                                        
                                        # Email para admin
                                        logger.info(f"📧 [POLLING] Enviando email para admin...")
                                        result3 = email_service.send_new_order_notification_to_admin(order=latest_payment.order)
                                        logger.info(f"{'✅' if result3 else '❌'} [POLLING] Email admin: {result3}")
                                        print(f"{'✅' if result3 else '❌'} [POLLING] Email admin: {result3}")
                                        logger.info(f"📧 [POLLING] Email de nova venda enviado para admin")
                                        print(f"📧 [POLLING] Email de nova venda enviado para admin")
                                        
                                    except Exception as e:
                                        logger.error(f"❌ [POLLING] Erro ao enviar emails de confirmação: {e}")
                                        print(f"❌ [POLLING] Erro ao enviar emails de confirmação: {e}")
                                        import traceback
                                        logger.error(traceback.format_exc())
                                        print(traceback.format_exc())
                                    # ========================================
                                    
                                    # Clear cart
                                    cart = latest_payment.order.cart or latest_payment.cart
                                    if cart and cart.status == 'active':
                                        cart.items.all().delete()
                                        cart.status = 'converted'
                                        cart.save(update_fields=['status'])
                                        CartHistory.objects.create(
                                            cart=cart,
                                            event='cart_cleared_after_polling',
                                            description=f'Cart cleared after payment confirmed via active polling',
                                            metadata={'order_id': latest_payment.order.id, 'payment_id': latest_payment.id}
                                        )
                                except Exception as e:
                                    logger.error(f"❌ Error processing order after active polling: {e}")
                            
                            # Refresh from DB to get updated values
                            latest_payment.refresh_from_db()
                            if latest_payment.order:
                                latest_payment.order.refresh_from_db()
                        else:
                            print(f"⚠️ [POLLING] No status change needed. Current: {latest_payment.status}, New: {new_status}")
                    
                    elif response_status == 'error':
                        # PaySuite returned an error status
                        error_msg = paysuite_response.get('message') or 'Payment processing failed'
                        new_status = 'failed'
                        
                        logger.info(f"❌ PaySuite returned error: {error_msg}")
                        print(f"❌ [POLLING] PaySuite error response: {error_msg}")
                        print(f"🔄 [POLLING] Status mapping: Current={latest_payment.status}, New={new_status}")
                        
                        if new_status != latest_payment.status:
                            logger.info(f"🔄 Updating payment {latest_payment.id} from {latest_payment.status} to failed based on PaySuite error")
                            
                            # Update payment status to failed
                            latest_payment.status = 'failed'
                            latest_payment.raw_response = {
                                **latest_payment.raw_response,
                                'polled_at': tz.now().isoformat(),
                                'polled_response': paysuite_response,
                                'error_message': error_msg
                            }
                            latest_payment.save(update_fields=['status', 'raw_response'])
                            
                            # Sync order status
                            if latest_payment.order:
                                old_order_status = latest_payment.order.status
                                latest_payment.order.status = 'failed'
                                latest_payment.order.save(update_fields=['status'])
                                logger.info(f"✅ Synced order {latest_payment.order.id} status: {old_order_status} → failed (via active polling)")
                            
                            # ========================================
                            # ENVIAR EMAIL DE FALHA (PaySuite Error)
                            # ========================================
                            if latest_payment.order:
                                try:
                                    from .email_service import get_email_service
                                    email_service = get_email_service()
                                    
                                    customer_email = latest_payment.order.shipping_address.get('email', '')
                                    customer_name = latest_payment.order.shipping_address.get('name', 'Cliente')
                                    
                                    if customer_email:
                                        email_service.send_payment_status_update(
                                            order=latest_payment.order,
                                            payment_status='failed',
                                            customer_email=customer_email,
                                            customer_name=customer_name
                                        )
                                        logger.info(f"📧 [POLLING] Email de falha (PaySuite error) enviado para {customer_email}")
                                        print(f"📧 [POLLING] Email de falha enviado para {customer_email}")
                                except Exception as e:
                                    logger.error(f"❌ [POLLING] Erro ao enviar email de falha: {e}")
                            # ========================================
                            
                            # Refresh from DB
                            latest_payment.refresh_from_db()
                            if latest_payment.order:
                                latest_payment.order.refresh_from_db()
                        else:
                            print(f"⚠️ [POLLING] Payment already marked as failed")
                    
                    else:
                        print(f"❌ [POLLING] Unexpected PaySuite response status: {response_status}")
                                
                except Exception as e:
                    print(f"❌ [POLLING] Exception during active polling: {e}")
                    logger.warning(f"⚠️ Active polling failed (non-fatal): {e}")
                    # Continue even if polling fails - return current DB state

        # Build response - order may be None if not yet created
        response_data = {
            'order': OrderSerializer(order).data if order else None,
            'payment_id': payments[0].id if payments else None,
            'payments': PaymentSerializer(payments, many=True).data if isinstance(payments, list) else PaymentSerializer(payments, many=True).data,
        }
        
        if order:
            logger.info(f"✅ Returning status: order.status={response_data['order']['status']}, payments={[p['status'] for p in response_data['payments']]}")
        else:
            logger.info(f"✅ Returning status: order=not_yet_created, payment_id={response_data['payment_id']}, payments={[p['status'] for p in response_data['payments']]}")
        
        return Response(response_data)
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


# ============================================
# COUPON MANAGEMENT - ADMIN API
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def admin_coupons_list_create(request):
    """
    Admin endpoint to list all coupons or create a new one
    GET: List all coupons with filters
    POST: Create new coupon
    """
    if request.method == 'GET':
        try:
            coupons = Coupon.objects.all().order_by('-created_at')
            
            # Optional filters
            is_active = request.GET.get('is_active')
            if is_active is not None:
                coupons = coupons.filter(is_active=is_active.lower() == 'true')
            
            discount_type = request.GET.get('discount_type')
            if discount_type:
                coupons = coupons.filter(discount_type=discount_type)
            
            # Check validity status
            search = request.GET.get('search')
            if search:
                coupons = coupons.filter(
                    code__icontains=search
                ) | coupons.filter(
                    name__icontains=search
                )
            
            serializer = CouponSerializer(coupons, many=True, context={'request': request})
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error listing coupons: {str(e)}")
            return Response(
                {'error': 'Failed to list coupons'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'POST':
        try:
            serializer = CouponSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                coupon = serializer.save()
                logger.info(f"Admin created coupon: {coupon.code}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error creating coupon: {str(e)}")
            return Response(
                {'error': 'Failed to create coupon'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdmin])
def admin_coupon_detail(request, coupon_id):
    """
    Admin endpoint to retrieve, update or delete a specific coupon
    GET: Get coupon details
    PUT: Update coupon
    DELETE: Delete coupon
    """
    try:
        coupon = get_object_or_404(Coupon, id=coupon_id)
    except Coupon.DoesNotExist:
        return Response(
            {'error': 'Coupon not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        try:
            serializer = CouponSerializer(coupon, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error getting coupon: {str(e)}")
            return Response(
                {'error': 'Failed to get coupon'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'PUT':
        try:
            serializer = CouponSerializer(
                coupon, 
                data=request.data, 
                partial=True,
                context={'request': request}
            )
            if serializer.is_valid():
                serializer.save()
                logger.info(f"Admin updated coupon: {coupon.code}")
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error updating coupon: {str(e)}")
            return Response(
                {'error': 'Failed to update coupon'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'DELETE':
        try:
            coupon_code = coupon.code
            coupon.delete()
            logger.info(f"Admin deleted coupon: {coupon_code}")
            return Response(
                {'message': f'Coupon {coupon_code} deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            logger.error(f"Error deleting coupon: {str(e)}")
            return Response(
                {'error': 'Failed to delete coupon'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_coupon_stats(request):
    """
    Get statistics about coupons usage
    """
    try:
        from django.db.models import Count, Sum, Q
        from .models import CouponUsage
        
        total_coupons = Coupon.objects.count()
        active_coupons = Coupon.objects.filter(is_active=True).count()
        expired_coupons = Coupon.objects.filter(
            valid_until__lt=timezone.now()
        ).count()
        
        # Most used coupons
        most_used = Coupon.objects.order_by('-used_count')[:5].values(
            'code', 'name', 'used_count', 'max_uses'
        )
        
        # Recent usage
        recent_usage = CouponUsage.objects.select_related(
            'coupon', 'user'
        ).order_by('-used_at')[:10].values(
            'coupon__code',
            'coupon__name',
            'user__username',
            'used_at'
        )
        
        return Response({
            'total_coupons': total_coupons,
            'active_coupons': active_coupons,
            'expired_coupons': expired_coupons,
            'most_used': list(most_used),
            'recent_usage': list(recent_usage),
        })
        
    except Exception as e:
        logger.error(f"Error getting coupon stats: {str(e)}")
        return Response(
            {'error': 'Failed to get coupon stats'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


