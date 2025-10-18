from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from products.models import Product, Color
import uuid


class Cart(models.Model):
    """
    Shopping cart model supporting both authenticated users and anonymous sessions
    """
    CART_STATUS_CHOICES = [
        ('active', 'Ativo'),
        ('abandoned', 'Abandonado'),
        ('converted', 'Convertido'),
        ('expired', 'Expirado'),
    ]
    
    # User relationship (null for anonymous carts)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='carts')
    
    # Session handling for anonymous users
    session_key = models.CharField(max_length=40, null=True, blank=True, db_index=True)
    
    # Cart status and abandonment tracking
    status = models.CharField(max_length=20, choices=CART_STATUS_CHOICES, default='active')
    
    # Timestamps for abandonment tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    # Cart totals (calculated fields)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Applied coupon
    applied_coupon = models.ForeignKey('Coupon', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Recovery tracking
    recovery_email_sent = models.BooleanField(default=False)
    recovery_email_sent_at = models.DateTimeField(null=True, blank=True)
    recovery_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    class Meta:
        verbose_name = "Carrinho"
        verbose_name_plural = "Carrinhos"
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['session_key', 'status']),
            models.Index(fields=['last_activity']),
        ]
    
    def __str__(self):
        if self.user:
            return f"Carrinho de {self.user.username} ({self.status})"
        return f"Carrinho anônimo {self.session_key[:8]} ({self.status})"
    
    def calculate_totals(self):
        """Calculate cart subtotal, discount, and total"""
        items = self.items.filter(product__status='active')
        self.subtotal = sum(item.get_total_price() for item in items)
        
        # Apply coupon discount if available
        if self.applied_coupon and self.applied_coupon.is_valid():
            self.discount_amount = self.applied_coupon.calculate_discount(self.subtotal)
        else:
            self.discount_amount = Decimal('0.00')
            
        self.total = self.subtotal - self.discount_amount
        self.save(update_fields=['subtotal', 'discount_amount', 'total', 'updated_at'])
    
    def get_total_items(self):
        """Get total quantity of items in cart"""
        return sum(item.quantity for item in self.items.all())
    
    def is_abandoned(self):
        """Check if cart should be considered abandoned (no activity for 1 hour)"""
        return (
            self.status == 'active' and 
            self.items.exists() and 
            timezone.now() - self.last_activity > timezone.timedelta(hours=1)
        )
    
    def mark_as_abandoned(self):
        """Mark cart as abandoned and update status"""
        if self.is_abandoned():
            self.status = 'abandoned'
            self.save(update_fields=['status'])
            return True
        return False


class CartItem(models.Model):
    """
    Individual items within a shopping cart
    """
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    color = models.ForeignKey(Color, on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Store price at time of addition
    
    # Timestamps
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Item do Carrinho"
        verbose_name_plural = "Itens do Carrinho"
        constraints = [
            models.UniqueConstraint(
                fields=['cart', 'product', 'color'],
                name='unique_cart_product_color'
            )
        ]
        indexes = [
            models.Index(fields=['cart', 'product']),
        ]
    
    def __str__(self):
        color_info = f" - {self.color.name}" if self.color else ""
        return f"{self.product.name}{color_info} x{self.quantity}"
    
    def get_total_price(self):
        """Calculate total price for this cart item"""
        return self.price * self.quantity
    
    def save(self, *args, **kwargs):
        # Store current product price if not set
        if not self.price:
            self.price = self.product.price
        super().save(*args, **kwargs)
        
        # Update cart totals after saving item
        self.cart.calculate_totals()


class Coupon(models.Model):
    """
    Coupon/discount system for cart promotions
    """
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentual'),
        ('fixed', 'Valor Fixo'),
    ]
    
    code = models.CharField(max_length=50, unique=True, verbose_name="Código")
    name = models.CharField(max_length=100, verbose_name="Nome")
    description = models.TextField(blank=True, verbose_name="Descrição")
    
    # Discount configuration
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Valor do Desconto")
    
    # Usage limits
    max_uses = models.PositiveIntegerField(null=True, blank=True, verbose_name="Máximo de Usos")
    used_count = models.PositiveIntegerField(default=0, verbose_name="Vezes Usado")
    max_uses_per_user = models.PositiveIntegerField(null=True, blank=True, verbose_name="Máximo por Usuário")
    
    # Validity period
    valid_from = models.DateTimeField(verbose_name="Válido De")
    valid_until = models.DateTimeField(verbose_name="Válido Até")
    
    # Minimum cart requirements
    minimum_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Valor Mínimo do Carrinho"
    )
    
    # Status
    is_active = models.BooleanField(default=True, verbose_name="Ativo")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Cupom"
        verbose_name_plural = "Cupons"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code', 'is_active']),
            models.Index(fields=['valid_from', 'valid_until']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    def is_valid(self, user=None, cart_total=None):
        """Check if coupon is valid for use"""
        now = timezone.now()
        
        # Basic validity checks
        if not self.is_active:
            return False
        
        if now < self.valid_from or now > self.valid_until:
            return False
        
        # Usage limit checks
        if self.max_uses and self.used_count >= self.max_uses:
            return False
        
        # Minimum amount check
        if self.minimum_amount and cart_total and cart_total < self.minimum_amount:
            return False
        
        # Per-user usage limit check
        if user and self.max_uses_per_user:
            user_usage = CouponUsage.objects.filter(
                coupon=self, user=user
            ).count()
            if user_usage >= self.max_uses_per_user:
                return False
        
        return True
    
    def calculate_discount(self, cart_total):
        """Calculate discount amount for given cart total"""
        if self.discount_type == 'percentage':
            discount = cart_total * (self.discount_value / 100)
        else:  # fixed
            discount = self.discount_value
        
        # Don't let discount exceed cart total
        return min(discount, cart_total)
    
    def use(self, user=None):
        """Mark coupon as used and track usage"""
        self.used_count += 1
        self.save(update_fields=['used_count'])
        
        if user:
            CouponUsage.objects.create(coupon=self, user=user)


class CouponUsage(models.Model):
    """
    Track coupon usage by users
    """
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, null=True, blank=True)
    used_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Uso de Cupom"
        verbose_name_plural = "Usos de Cupom"
        ordering = ['-used_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.coupon.code}"


class CartHistory(models.Model):
    """
    Track cart lifecycle and events for analytics
    """
    EVENT_CHOICES = [
        ('created', 'Criado'),
        ('item_added', 'Item Adicionado'),
        ('item_removed', 'Item Removido'),
        ('item_updated', 'Item Atualizado'),
        ('coupon_applied', 'Cupom Aplicado'),
        ('coupon_removed', 'Cupom Removido'),
        ('abandoned', 'Abandonado'),
        ('recovery_sent', 'Email de Recuperação Enviado'),
        ('converted', 'Convertido'),
    ]
    
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='history')
    event = models.CharField(max_length=50, choices=EVENT_CHOICES)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)  # Store additional event data
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Histórico do Carrinho"
        verbose_name_plural = "Históricos dos Carrinhos"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['cart', 'event']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.cart} - {self.get_event_display()}"


class AbandonedCart(models.Model):
    """
    Specific model for tracking abandoned carts and recovery attempts
    """
    cart = models.OneToOneField(Cart, on_delete=models.CASCADE, related_name='abandonment_info')
    
    # Recovery email tracking
    recovery_emails_sent = models.PositiveIntegerField(default=0)
    last_recovery_sent = models.DateTimeField(null=True, blank=True)
    
    # Recovery success tracking
    recovered = models.BooleanField(default=False)
    recovered_at = models.DateTimeField(null=True, blank=True)
    
    # Analytics
    abandonment_stage = models.CharField(
        max_length=50, 
        choices=[
            ('product_added', 'Produto Adicionado'),
            ('cart_viewed', 'Carrinho Visualizado'),
            ('checkout_started', 'Checkout Iniciado'),
        ],
        default='product_added'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Carrinho Abandonado"
        verbose_name_plural = "Carrinhos Abandonados"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recovered', 'last_recovery_sent']),
        ]
    
    def __str__(self):
        return f"Carrinho abandonado: {self.cart}"
    
    def should_send_recovery_email(self):
        """Check if recovery email should be sent"""
        if self.recovered:
            return False
        
        # Don't send more than 3 recovery emails
        if self.recovery_emails_sent >= 3:
            return False
        
        # Wait at least 24 hours between recovery emails
        if self.last_recovery_sent:
            time_since_last = timezone.now() - self.last_recovery_sent
            if time_since_last < timezone.timedelta(hours=24):
                return False
        
        return True


class Order(models.Model):
    """
    Complete Order model for modern e-commerce functionality
    """
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('confirmed', 'Confirmado'),
        ('processing', 'Processando'),
        ('shipped', 'Enviado'),
        ('delivered', 'Entregue'),
        ('cancelled', 'Cancelado'),
        ('refunded', 'Reembolsado'),
        ('paid', 'Pago'),  # Manter para compatibilidade
        ('failed', 'Falhou'),  # Manter para compatibilidade
    ]

    SHIPPING_METHODS = [
        ('standard', 'Entrega Padrão'),
        ('express', 'Entrega Expressa'),
        ('pickup', 'Retirada na Loja'),
        ('same_day', 'Entrega no Mesmo Dia'),
    ]

    # Basic Order Info
    cart = models.ForeignKey(Cart, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    order_number = models.CharField(max_length=50, unique=True, null=True, blank=True, verbose_name="Número do Pedido")
    
    # Financial Info
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), verbose_name="Custo de Entrega")
    
    # Status & Timeline
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name="Entregue em")
    # Admin review tracking (was present in DB schema on some environments)
    # Keep default False so existing databases without a migration won't fail when creating orders
    admin_seen = models.BooleanField(default=False, verbose_name="Visto pelo Admin")
    
    # Shipping Info
    shipping_method = models.CharField(max_length=50, choices=SHIPPING_METHODS, default='standard', verbose_name="Método de Entrega")
    shipping_address = models.JSONField(default=dict, blank=True, verbose_name="Endereço de Entrega")
    billing_address = models.JSONField(default=dict, blank=True, verbose_name="Endereço de Cobrança")
    tracking_number = models.CharField(max_length=100, null=True, blank=True, verbose_name="Número de Rastreamento")
    estimated_delivery = models.DateField(null=True, blank=True, verbose_name="Previsão de Entrega")
    
    # Notes
    notes = models.TextField(blank=True, verbose_name="Observações Internas")
    customer_notes = models.TextField(blank=True, verbose_name="Observações do Cliente")

    class Meta:
        verbose_name = "Pedido"
        verbose_name_plural = "Pedidos"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['order_number']),
            models.Index(fields=['tracking_number']),
        ]

    def __str__(self):
        return f"Pedido {self.order_number or self.id} - {self.get_status_display()}"

    def save(self, *args, **kwargs):
        # Generate order number if not provided
        if not self.order_number:
            import datetime
            today = datetime.date.today()
            prefix = f"CHV{today.strftime('%Y%m%d')}"
            
            # Find the next number for today
            last_order = Order.objects.filter(
                order_number__startswith=prefix
            ).order_by('-order_number').first()
            
            if last_order and last_order.order_number:
                try:
                    last_number = int(last_order.order_number[-4:])
                    next_number = last_number + 1
                except (ValueError, IndexError):
                    next_number = 1
            else:
                next_number = 1
                
            self.order_number = f"{prefix}{next_number:04d}"
            
        super().save(*args, **kwargs)

    @property
    def subtotal(self):
        """Calculate subtotal (total - shipping)"""
        return self.total_amount - self.shipping_cost

    @property
    def is_delivered(self):
        """Check if order is delivered"""
        return self.status == 'delivered'

    @property
    def is_shipped(self):
        """Check if order is shipped or delivered"""
        return self.status in ['shipped', 'delivered']

    @property
    def can_be_cancelled(self):
        """Check if order can be cancelled"""
        return self.status in ['pending', 'confirmed']

    def get_shipping_address_display(self):
        """Get formatted shipping address"""
        if not self.shipping_address:
            return ""
        
        addr = self.shipping_address
        parts = [
            addr.get('address', ''),
            addr.get('city', ''),
            addr.get('province', ''),
            addr.get('postal_code', '')
        ]
        return ', '.join(filter(None, parts))

    def get_customer_info(self):
        """Get customer information"""
        if self.user:
            return {
                'name': f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username,
                'email': self.user.email,
                'phone': self.shipping_address.get('phone', '') if self.shipping_address else ''
            }
        elif self.shipping_address:
            return {
                'name': self.shipping_address.get('name', ''),
                'email': self.shipping_address.get('email', ''),
                'phone': self.shipping_address.get('phone', '')
            }
        return {'name': 'Cliente Anônimo', 'email': '', 'phone': ''}


class OrderStatusHistory(models.Model):
    """
    Track order status changes for audit and customer notifications
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20, choices=Order.STATUS_CHOICES, null=True, blank=True)
    new_status = models.CharField(max_length=20, choices=Order.STATUS_CHOICES)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, verbose_name="Observações")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Histórico de Status"
        verbose_name_plural = "Históricos de Status"
        ordering = ['-created_at']

    def __str__(self):
        return f"Pedido {self.order.order_number}: {self.old_status} → {self.new_status}"


class OrderItem(models.Model):
    """
    Items that belong to an Order. Stored as a snapshot so admins can see
    exactly what to ship even if product records change later.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Snapshot fields - critical for fulfillment
    product_name = models.CharField(max_length=255, blank=True)
    sku = models.CharField(max_length=100, blank=True)
    product_image = models.URLField(max_length=500, blank=True, null=True)
    
    # Color information
    color = models.ForeignKey('products.Color', on_delete=models.SET_NULL, null=True, blank=True)
    color_name = models.CharField(max_length=100, blank=True)
    color_hex = models.CharField(max_length=7, blank=True)
    
    # Pricing snapshot
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Additional product details for shipping/handling
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Peso em kg")
    dimensions = models.CharField(max_length=100, blank=True, help_text="Dimensões (LxWxH)")
    
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    
    class Meta:
        verbose_name = "Item do Pedido"
        verbose_name_plural = "Itens do Pedido"
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.product_name} x{self.quantity}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate subtotal
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class ShippingMethod(models.Model):
    """
    Configurable shipping methods stored in DB and manageable via admin/API
    """
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    min_order = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    delivery_time = models.CharField(max_length=100, blank=True)
    regions = models.CharField(max_length=255, blank=True)
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Método de Envio"
        verbose_name_plural = "Métodos de Envio"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.id})"


class StockMovement(models.Model):
    """
    Track stock movements for inventory management
    """
    MOVEMENT_TYPES = [
        ('sale', 'Venda'),
        ('return', 'Devolução'),
        ('restock', 'Reposição'),
        ('adjustment', 'Ajuste'),
        ('damage', 'Dano/Perda'),
    ]

    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='stock_movements')
    color = models.ForeignKey('products.Color', on_delete=models.SET_NULL, null=True, blank=True)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True)
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField()  # Pode ser negativo para saídas
    previous_stock = models.IntegerField()
    new_stock = models.IntegerField()
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Movimentação de Estoque"
        verbose_name_plural = "Movimentações de Estoque"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product.name} - {self.get_movement_type_display()}: {self.quantity}"


class Payment(models.Model):
    """
    Payment record for external gateways (Paysuite)
    """
    METHOD_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('emola', 'e-mola'),
    ]

    STATUS_CHOICES = [
        ('initiated', 'Iniciado'),
        ('pending', 'Pendente'),
        ('paid', 'Pago'),
        ('failed', 'Falhou'),
    ]

    # Allow payment to exist before an Order is created (order will be created on webhook success)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    # Link payment to the cart used to initiate it; useful to create the Order later on webhook
    cart = models.ForeignKey('Cart', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    method = models.CharField(max_length=30, choices=METHOD_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='MZN')
    paysuite_reference = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    raw_response = models.JSONField(default=dict, blank=True)
    # Store the original request payload (shipping_address, billing_address, method, etc.)
    request_data = models.JSONField(default=dict, blank=True)
    # Track polling attempts for timeout detection
    poll_count = models.IntegerField(default=0, help_text="Number of times payment status was polled")
    last_polled_at = models.DateTimeField(null=True, blank=True, help_text="Last time payment status was checked")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Pagamento"
        verbose_name_plural = "Pagamentos"
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id} ({self.method}) - {self.get_status_display()}"
