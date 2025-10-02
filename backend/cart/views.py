from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
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
import logging

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
            if product.stock < quantity:
                return Response(
                    {'error': f'Insufficient stock. Available: {product.stock}'},
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
                    if new_quantity > product.stock:
                        return Response(
                            {'error': f'Total quantity exceeds stock. Available: {product.stock}'},
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
            
            # Return updated cart
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
            if new_quantity > cart_item.product.stock:
                return Response(
                    {'error': f'Insufficient stock. Available: {cart_item.product.stock}'},
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
@permission_classes([IsAuthenticated])
def abandoned_carts(request):
    """Get abandoned carts for current user (admin functionality)"""
    try:
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        abandoned_carts = AbandonedCart.objects.select_related('cart').prefetch_related('cart__items__product')
        return Response(AbandonedCartSerializer(abandoned_carts, many=True).data)
        
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
    """Initiate a payment via Paysuite for the current cart"""
    try:
        # Get current cart
        cart = Cart.objects.filter(user=request.user, status='active').first()
        if not cart:
            return Response({'error': 'No active cart'}, status=status.HTTP_404_NOT_FOUND)

        # Recalculate totals
        cart.calculate_totals()

        # Create order
        from .models import Order, Payment
        order = Order.objects.create(cart=cart, user=request.user, total_amount=cart.total, status='pending')

        # Payment method requested
        method = request.data.get('method', 'mpesa')

        # Create payment record
        payment = Payment.objects.create(order=order, method=method, amount=cart.total, currency='MZN', status='initiated')

        # Call Paysuite
        from .payments.paysuite import PaysuiteClient
        client = PaysuiteClient()
        # Correct API path for webhook lives under /api/cart/
        callback_url = request.build_absolute_uri('/api/cart/payments/webhook/')
        resp = client.create_payment(
            amount=payment.amount,
            currency=payment.currency,
            method=method,
            customer={'email': request.user.email},
            metadata={'order_id': order.id},
            callback_url=callback_url,
        )

        # Store reference and raw response
        payment.paysuite_reference = resp.get('reference') or resp.get('id')
        payment.raw_response = resp
        payment.status = 'pending'
        payment.save()

        return Response({'order_id': order.id, 'payment': resp})

    except Exception as e:
        logger.exception('Error initiating payment')
        return Response({'error': 'Failed to initiate payment'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def paysuite_webhook(request):
    """Endpoint to receive Paysuite callbacks/webhooks"""
    try:
        from .payments.paysuite import PaysuiteClient
        client = PaysuiteClient()

        payload = request.body
        # Accept multiple common header names; prioritize Paysuite's documented one if available
        signature = (
            request.headers.get('X-Paysuite-Signature')
            or request.headers.get('X-Signature')
            or request.headers.get('Stripe-Signature')  # in case provider mimics Stripe format
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

        # Find payment by reference or metadata
        reference = data.get('reference') or data.get('id') or data.get('data', {}).get('reference')
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

        # Update payment status based on payload
        status_map = {
            'success': 'paid',
            'completed': 'paid',
            'failed': 'failed',
            'pending': 'pending'
        }
        event_status = (data.get('status') or data.get('payment_status') or '').lower()
        mapped = status_map.get(event_status)
        if mapped:
            payment.status = mapped
            payment.raw_response = data
            payment.save()

            # Update order
            order = payment.order
            if mapped == 'paid':
                order.status = 'paid'
                order.save()

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
