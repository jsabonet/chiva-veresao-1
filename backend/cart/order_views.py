"""
Advanced Order Management Views
Modern e-commerce order management endpoints
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Sum, F
from django.utils import timezone
from datetime import timedelta
import logging

from .models import Order, Payment, OrderStatusHistory, StockMovement
from .serializers import (
    OrderSerializer, PaymentSerializer, OrderStatusHistorySerializer, 
    StockMovementSerializer
)
from .stock_management import OrderManager, StockManager

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_orders(request):
    """
    Get all orders for the authenticated user
    """
    orders = Order.objects.filter(
        user=request.user
    ).prefetch_related('payments', 'status_history').order_by('-created_at')
    
    # Filter by status if provided
    status_filter = request.GET.get('status')
    if status_filter:
        orders = orders.filter(status=status_filter)
    
    # Pagination
    page_size = int(request.GET.get('page_size', 20))
    page = int(request.GET.get('page', 1))
    start = (page - 1) * page_size
    end = start + page_size
    
    total_count = orders.count()
    orders_page = orders[start:end]
    
    serializer = OrderSerializer(orders_page, many=True)
    
    return Response({
        'orders': serializer.data,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total_count,
            'has_next': end < total_count,
            'has_previous': page > 1
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    """
    Get detailed information about a specific order
    """
    order = get_object_or_404(
        Order.objects.prefetch_related(
            'payments', 'status_history', 'cart__items__product', 'cart__items__color'
        ),
        Q(id=order_id) & (Q(user=request.user) | Q(user__isnull=True))
    )
    
    # Serialize order
    order_data = OrderSerializer(order).data
    
    # Add cart items information
    if order.cart:
        cart_items = []
        for item in order.cart.items.all():
            cart_items.append({
                'id': item.product.id,
                'name': item.product.name,
                'sku': item.product.sku,
                'price': str(item.price),
                'quantity': item.quantity,
                'color': item.color.name if item.color else None,
                'image': item.product.get_main_image(),
                'total': str(item.price * item.quantity)
            })
        order_data['items'] = cart_items
    
    # Add status history
    status_history = OrderStatusHistorySerializer(
        order.status_history.all(), many=True
    ).data
    order_data['status_history'] = status_history
    
    return Response(order_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    """
    Cancel an order (if possible)
    """
    order = get_object_or_404(Order, id=order_id, user=request.user)
    
    if not order.can_be_cancelled:
        return Response({
            'error': 'Este pedido não pode ser cancelado'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        OrderManager.update_order_status(
            order=order,
            new_status='cancelled',
            user=request.user,
            notes=request.data.get('reason', 'Cancelado pelo cliente')
        )
        
        return Response({
            'message': 'Pedido cancelado com sucesso',
            'order': OrderSerializer(order).data
        })
        
    except Exception as e:
        logger.error(f"Error cancelling order {order_id}: {e}")
        return Response({
            'error': 'Erro ao cancelar pedido'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Admin Views

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_orders_list(request):
    """
    Admin view to list all orders with filters
    """
    orders = Order.objects.select_related('user').prefetch_related('payments')
    
    # Filters
    status_filter = request.GET.get('status')
    if status_filter:
        orders = orders.filter(status=status_filter)
    
    date_from = request.GET.get('date_from')
    if date_from:
        orders = orders.filter(created_at__date__gte=date_from)
    
    date_to = request.GET.get('date_to')
    if date_to:
        orders = orders.filter(created_at__date__lte=date_to)
    
    search = request.GET.get('search')
    if search:
        orders = orders.filter(
            Q(order_number__icontains=search) |
            Q(user__email__icontains=search) |
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search)
        )
    
    # Sorting
    sort_by = request.GET.get('sort_by', '-created_at')
    orders = orders.order_by(sort_by)
    
    # Pagination
    page_size = int(request.GET.get('page_size', 50))
    page = int(request.GET.get('page', 1))
    start = (page - 1) * page_size
    end = start + page_size
    
    total_count = orders.count()
    orders_page = orders[start:end]
    
    serializer = OrderSerializer(orders_page, many=True)
    
    return Response({
        'orders': serializer.data,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total_count,
            'has_next': end < total_count,
            'has_previous': page > 1
        }
    })


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_update_order_status(request, order_id):
    """
    Admin endpoint to update order status
    """
    order = get_object_or_404(Order, id=order_id)
    new_status = request.data.get('status')
    notes = request.data.get('notes', '')
    
    if not new_status:
        return Response({
            'error': 'Status é obrigatório'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate status
    valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return Response({
            'error': 'Status inválido'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        OrderManager.update_order_status(
            order=order,
            new_status=new_status,
            user=request.user,
            notes=notes
        )
        
        # Update other fields if provided
        if 'tracking_number' in request.data:
            order.tracking_number = request.data['tracking_number']
        
        if 'estimated_delivery' in request.data:
            order.estimated_delivery = request.data['estimated_delivery']
        
        if 'notes' in request.data:
            order.notes = request.data['notes']
        
        order.save()
        
        return Response({
            'message': 'Pedido atualizado com sucesso',
            'order': OrderSerializer(order).data
        })
        
    except Exception as e:
        logger.error(f"Error updating order {order_id}: {e}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_orders_stats(request):
    """
    Get order statistics for admin dashboard
    """
    today = timezone.now().date()
    last_30_days = today - timedelta(days=30)
    
    # Basic stats
    total_orders = Order.objects.count()
    pending_orders = Order.objects.filter(status='pending').count()
    processing_orders = Order.objects.filter(status='processing').count()
    shipped_orders = Order.objects.filter(status='shipped').count()
    delivered_orders = Order.objects.filter(status='delivered').count()
    
    # Revenue stats
    total_revenue = Order.objects.filter(
        status__in=['delivered', 'shipped', 'processing']
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    
    monthly_revenue = Order.objects.filter(
        created_at__date__gte=last_30_days,
        status__in=['delivered', 'shipped', 'processing']
    ).aggregate(total=Sum('total_amount'))['total'] or 0
    
    # Recent orders
    recent_orders = Order.objects.select_related('user').order_by('-created_at')[:10]
    recent_orders_data = OrderSerializer(recent_orders, many=True).data
    
    return Response({
        'stats': {
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'processing_orders': processing_orders,
            'shipped_orders': shipped_orders,
            'delivered_orders': delivered_orders,
            'total_revenue': total_revenue,
            'monthly_revenue': monthly_revenue,
        },
        'recent_orders': recent_orders_data
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def stock_report(request):
    """
    Get comprehensive stock report
    """
    report = StockManager.get_stock_report()
    low_stock_products = StockManager.check_stock_levels()
    
    # Recent stock movements
    recent_movements = StockMovement.objects.select_related(
        'product', 'color', 'order', 'created_by'
    ).order_by('-created_at')[:20]
    
    movements_data = StockMovementSerializer(recent_movements, many=True).data
    
    # Low stock products data
    low_stock_data = []
    for product in low_stock_products[:20]:  # Limit to 20 items
        low_stock_data.append({
            'id': product.id,
            'name': product.name,
            'sku': product.sku,
            'current_stock': product.stock_quantity,
            'min_stock_level': product.min_stock_level,
            'category': product.category.name if product.category else '',
            'price': str(product.price)
        })
    
    return Response({
        'report': report,
        'low_stock_products': low_stock_data,
        'recent_movements': movements_data
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def adjust_stock(request):
    """
    Manual stock adjustment endpoint
    """
    product_id = request.data.get('product_id')
    quantity = request.data.get('quantity')
    notes = request.data.get('notes', '')
    
    if not product_id or quantity is None:
        return Response({
            'error': 'product_id e quantity são obrigatórios'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from products.models import Product
        product = get_object_or_404(Product, id=product_id)
        
        previous_stock = product.stock_quantity
        new_stock = max(0, previous_stock + int(quantity))  # Don't allow negative stock
        
        product.stock_quantity = new_stock
        product.save(update_fields=['stock_quantity'])
        
        # Create stock movement record
        StockMovement.objects.create(
            product=product,
            movement_type='adjustment',
            quantity=int(quantity),
            previous_stock=previous_stock,
            new_stock=new_stock,
            notes=notes or f'Ajuste manual: {quantity}',
            created_by=request.user
        )
        
        return Response({
            'message': 'Estoque ajustado com sucesso',
            'product': {
                'id': product.id,
                'name': product.name,
                'previous_stock': previous_stock,
                'new_stock': new_stock,
                'adjustment': int(quantity)
            }
        })
        
    except Exception as e:
        logger.error(f"Error adjusting stock: {e}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_items(request, order_id):
    """
    Get items for a specific order
    """
    try:
        logger.info(f"Fetching items for order {order_id}")
        order = get_object_or_404(Order, id=order_id)
        logger.info(f"Found order: {order.order_number}")
        
        # Check permissions
        if not (request.user.is_staff or order.user == request.user):
            logger.warning(f"Access denied for user {request.user.id} on order {order_id}")
            return Response({
                'error': 'Acesso negado'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get items from the associated cart
        if order.cart:
            items = order.cart.items.all()
            logger.info(f"Found {items.count()} items in cart {order.cart.id}")
        else:
            items = []
            logger.warning(f"Order {order_id} has no associated cart")
        
        items_data = []
        
        for item in items:
            try:
                # Safely get image URL
                image_url = None
                if hasattr(item.product, 'image') and item.product.image:
                    try:
                        image_url = item.product.image.url
                    except (AttributeError, ValueError) as img_error:
                        logger.warning(f"Error getting image for product {item.product.id}: {img_error}")
                        image_url = None
                
                item_data = {
                    'id': item.id,
                    'name': getattr(item.product, 'name', 'Produto sem nome'),
                    'quantity': item.quantity,
                    'price': float(item.price),
                    'image': image_url,
                }
                items_data.append(item_data)
                logger.debug(f"Added item: {item_data['name']}")
                
            except Exception as item_error:
                logger.error(f"Error processing item {item.id}: {item_error}")
                # Continue processing other items
                continue
        
        logger.info(f"Successfully processed {len(items_data)} items for order {order_id}")
        return Response({
            'items': items_data
        })
        
    except Exception as e:
        import traceback
        logger.error(f"Error fetching order items {order_id}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response({
            'error': f'Erro interno: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_update_order_tracking(request, order_id):
    """
    Update order tracking number
    """
    try:
        order = get_object_or_404(Order, id=order_id)
        tracking_number = request.data.get('tracking_number', '')
        
        order.tracking_number = tracking_number
        order.save()
        
        return Response({
            'message': 'Código de rastreamento atualizado com sucesso',
            'tracking_number': tracking_number
        })
        
    except Exception as e:
        logger.error(f"Error updating order tracking {order_id}: {e}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_update_order_notes(request, order_id):
    """
    Update order notes
    """
    try:
        order = get_object_or_404(Order, id=order_id)
        notes = request.data.get('notes', '')
        
        order.notes = notes
        order.save()
        
        return Response({
            'message': 'Observações atualizadas com sucesso',
            'notes': notes
        })
        
    except Exception as e:
        logger.error(f"Error updating order notes {order_id}: {e}")
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)