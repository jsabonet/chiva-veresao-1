"""
Stock Management Utilities
Utilities for managing product stock and inventory
"""

from django.db import transaction
from django.db import models
from django.contrib.auth.models import User
from products.models import Product
from .models import StockMovement, Order, OrderStatusHistory
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class StockManager:
    """
    Centralized stock management class
    """
    
    @staticmethod
    @transaction.atomic
    def reduce_stock_for_order(order: Order, user: User = None):
        """
        Reduce stock for all items in an order
        """
        if not order.cart:
            logger.warning(f"Order {order.id} has no cart associated")
            return False
            
        movements = []
        
        for cart_item in order.cart.items.all():
            product = cart_item.product
            color = cart_item.color
            quantity = cart_item.quantity
            
            # Check if we have enough stock
            if product.stock_quantity < quantity:
                logger.error(f"Insufficient stock for product {product.name}. Required: {quantity}, Available: {product.stock_quantity}")
                raise ValueError(f"Estoque insuficiente para {product.name}")
            
            # Reduce stock
            previous_stock = product.stock_quantity
            product.stock_quantity -= quantity
            product.save(update_fields=['stock_quantity'])
            
            # Create stock movement record
            movement = StockMovement.objects.create(
                product=product,
                color=color,
                order=order,
                movement_type='sale',
                quantity=-quantity,  # Negative for stock reduction
                previous_stock=previous_stock,
                new_stock=product.stock_quantity,
                notes=f"Venda - Pedido {order.order_number}",
                created_by=user
            )
            movements.append(movement)
            
            logger.info(f"Stock reduced for {product.name}: {previous_stock} → {product.stock_quantity}")
            
        return movements
    
    @staticmethod
    @transaction.atomic
    def restore_stock_for_order(order: Order, user: User = None):
        """
        Restore stock for cancelled orders
        """
        if not order.cart:
            logger.warning(f"Order {order.id} has no cart associated")
            return False
            
        movements = []
        
        for cart_item in order.cart.items.all():
            product = cart_item.product
            color = cart_item.color
            quantity = cart_item.quantity
            
            # Restore stock
            previous_stock = product.stock_quantity
            product.stock_quantity += quantity
            product.save(update_fields=['stock_quantity'])
            
            # Create stock movement record
            movement = StockMovement.objects.create(
                product=product,
                color=color,
                order=order,
                movement_type='return',
                quantity=quantity,  # Positive for stock increase
                previous_stock=previous_stock,
                new_stock=product.stock_quantity,
                notes=f"Devolução - Pedido cancelado {order.order_number}",
                created_by=user
            )
            movements.append(movement)
            
            logger.info(f"Stock restored for {product.name}: {previous_stock} → {product.stock_quantity}")
            
        return movements
    
    @staticmethod
    def check_stock_levels():
        """
        Check for products with low stock
        """
        low_stock_products = Product.objects.filter(
            stock_quantity__lte=models.F('min_stock_level'),
            status='active'
        ).select_related('category')
        
        return low_stock_products
    
    @staticmethod
    def get_stock_report():
        """
        Get comprehensive stock report
        """
        from django.db.models import Count, Sum, F
        
        total_products = Product.objects.count()
        active_products = Product.objects.filter(status='active').count()
        out_of_stock = Product.objects.filter(stock_quantity=0).count()
        low_stock = Product.objects.filter(
            stock_quantity__lte=F('min_stock_level'),
            stock_quantity__gt=0
        ).count()
        
        total_stock_value = Product.objects.filter(
            status='active'
        ).aggregate(
            total_value=Sum(F('stock_quantity') * F('price'))
        )['total_value'] or Decimal('0.00')
        
        return {
            'total_products': total_products,
            'active_products': active_products,
            'out_of_stock': out_of_stock,
            'low_stock': low_stock,
            'total_stock_value': total_stock_value,
            'stock_percentage': {
                'in_stock': ((active_products - out_of_stock) / max(active_products, 1)) * 100,
                'out_of_stock': (out_of_stock / max(active_products, 1)) * 100,
                'low_stock': (low_stock / max(active_products, 1)) * 100,
            }
        }


class OrderManager:
    """
    Centralized order management class
    """
    
    @staticmethod
    @transaction.atomic
    def update_order_status(order: Order, new_status: str, user: User = None, notes: str = ""):
        """
        Update order status with history tracking
        """
        old_status = order.status
        
        if old_status == new_status:
            return order
        
        # Update order status
        order.status = new_status
        
        # Handle specific status changes
        if new_status == 'delivered':
            from django.utils import timezone
            order.delivered_at = timezone.now()
        
        order.save()
        
        # Create status history record
        OrderStatusHistory.objects.create(
            order=order,
            old_status=old_status,
            new_status=new_status,
            changed_by=user,
            notes=notes
        )
        
        # Handle stock operations based on status change
        if old_status in ['pending', 'confirmed'] and new_status == 'paid':
            # Reduce stock when payment is confirmed
            try:
                StockManager.reduce_stock_for_order(order, user)
                logger.info(f"Stock reduced for paid order {order.order_number}")
            except ValueError as e:
                logger.error(f"Failed to reduce stock for order {order.order_number}: {e}")
                # You might want to handle this differently based on business logic
                
        elif old_status in ['paid', 'processing', 'shipped'] and new_status == 'cancelled':
            # Restore stock when order is cancelled after payment
            try:
                StockManager.restore_stock_for_order(order, user)
                logger.info(f"Stock restored for cancelled order {order.order_number}")
            except Exception as e:
                logger.error(f"Failed to restore stock for order {order.order_number}: {e}")
        
        # ========================================
        # ENVIAR EMAILS DE NOTIFICAÇÃO
        # ========================================
        try:
            from .email_service import get_email_service
            email_service = get_email_service()
            
            # Obter dados do cliente
            customer_email = ''
            customer_name = 'Cliente'
            
            # Priorizar dados do user, depois shipping_address
            if order.user and order.user.email:
                customer_email = order.user.email
                customer_name = order.user.get_full_name() or order.user.username
            
            if isinstance(order.shipping_address, dict):
                if not customer_email:
                    customer_email = order.shipping_address.get('email', '')
                if not customer_name or customer_name == 'Cliente':
                    customer_name = order.shipping_address.get('name', 'Cliente')
            
            if not customer_email:
                logger.warning(f"⚠️ Nenhum email encontrado para pedido {order.order_number}")
            else:
                # Mapear status para métodos de email
                email_sent_customer = False
                email_sent_admin = False
                
                # 1. EMAIL PARA O CLIENTE
                if new_status == 'confirmed':
                    email_sent_customer = email_service.send_order_confirmed(
                        order=order,
                        customer_email=customer_email,
                        customer_name=customer_name
                    )
                    logger.info(f"📧 Email 'Confirmado' enviado para {customer_email}: {email_sent_customer}")
                
                elif new_status == 'processing':
                    email_sent_customer = email_service.send_order_processing(
                        order=order,
                        customer_email=customer_email,
                        customer_name=customer_name
                    )
                    logger.info(f"📧 Email 'Processando' enviado para {customer_email}: {email_sent_customer}")
                
                elif new_status == 'shipped':
                    email_sent_customer = email_service.send_shipping_update(
                        order=order,
                        tracking_number=order.tracking_number,
                        customer_email=customer_email,
                        customer_name=customer_name
                    )
                    logger.info(f"📧 Email 'Enviado' enviado para {customer_email}: {email_sent_customer}")
                
                elif new_status == 'delivered':
                    email_sent_customer = email_service.send_order_delivered(
                        order=order,
                        customer_email=customer_email,
                        customer_name=customer_name
                    )
                    logger.info(f"📧 Email 'Entregue' enviado para {customer_email}: {email_sent_customer}")
                
                elif new_status == 'cancelled':
                    email_sent_customer = email_service.send_order_cancelled(
                        order=order,
                        customer_email=customer_email,
                        customer_name=customer_name,
                        cancellation_reason=notes  # Usar notes como motivo do cancelamento
                    )
                    logger.info(f"📧 Email 'Cancelado' enviado para {customer_email}: {email_sent_customer}")
                
                # 2. EMAIL PARA O ADMIN (sempre enviar para mudanças importantes)
                if new_status in ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']:
                    updated_by_name = user.get_full_name() if user else "Sistema"
                    email_sent_admin = email_service.send_admin_status_change(
                        order=order,
                        old_status=old_status,
                        new_status=new_status,
                        updated_by=updated_by_name,
                        notes=notes
                    )
                    logger.info(f"📧 Email admin (status change) enviado: {email_sent_admin}")
                
                # Log consolidado
                if email_sent_customer or email_sent_admin:
                    logger.info(f"✅ Emails enviados para pedido {order.order_number}: Cliente={email_sent_customer}, Admin={email_sent_admin}")
                    
        except Exception as e:
            logger.error(f"❌ Erro ao enviar emails de notificação: {e}")
            import traceback
            logger.error(traceback.format_exc())
        # ========================================
        
        logger.info(f"Order {order.order_number} status changed: {old_status} → {new_status}")
        
        return order
    
    @staticmethod
    def generate_tracking_number(order: Order):
        """
        Generate tracking number for an order
        """
        import random
        import string
        
        # Simple tracking number generation
        # In production, this might integrate with shipping provider APIs
        prefix = "CHV"
        random_part = ''.join(random.choices(string.digits, k=8))
        tracking_number = f"{prefix}{random_part}"
        
        # Ensure uniqueness
        while Order.objects.filter(tracking_number=tracking_number).exists():
            random_part = ''.join(random.choices(string.digits, k=8))
            tracking_number = f"{prefix}{random_part}"
        
        order.tracking_number = tracking_number
        order.save(update_fields=['tracking_number'])
        
        return tracking_number
    
    @staticmethod
    def calculate_estimated_delivery(order: Order):
        """
        Calculate estimated delivery date based on shipping method
        """
        from datetime import date, timedelta
        
        delivery_days = {
            'standard': 5,
            'express': 2,
            'pickup': 1,
            'same_day': 0,
        }
        
        days = delivery_days.get(order.shipping_method, 5)
        estimated_date = date.today() + timedelta(days=days)
        
        order.estimated_delivery = estimated_date
        order.save(update_fields=['estimated_delivery'])
        
        return estimated_date


# Signal handlers for automatic stock management
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Order)
def handle_order_status_change(sender, instance, created, **kwargs):
    """
    Handle automatic actions when order status changes
    """
    if created:
        # New order - calculate estimated delivery
        OrderManager.calculate_estimated_delivery(instance)
    
    # Generate tracking number when order is shipped
    if instance.status == 'shipped' and not instance.tracking_number:
        OrderManager.generate_tracking_number(instance)