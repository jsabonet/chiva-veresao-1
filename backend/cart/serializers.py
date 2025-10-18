from rest_framework import serializers
from .models import ShippingMethod


class ShippingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingMethod
        fields = ['id', 'name', 'price', 'min_order', 'delivery_time', 'regions', 'enabled']
        read_only_fields = ['id']

    def validate_price(self, value):
        if value is None:
            return value
        if float(value) < 0:
            raise serializers.ValidationError('Price must be >= 0')
        return value

    def validate_min_order(self, value):
        if value is None:
            return value
        if float(value) < 0:
            raise serializers.ValidationError('min_order must be >= 0')
        return value

    def validate_id(self, value):
        # Basic id format check - only validate when an id is provided (e.g. on update)
        if value is None:
            return value
        if not value:
            raise serializers.ValidationError('id is required')
        if ' ' in value:
            raise serializers.ValidationError('id must not contain spaces')
        return value

    def create(self, validated_data):
        """Ensure a non-empty, unique id is assigned if client didn't provide one."""
        # id is read-only in the serializer, but ensure model gets a sensible id
        if not validated_data.get('id'):
            from django.utils.text import slugify
            base = slugify(validated_data.get('name') or 'shipping') or 'shipping'
            candidate = base
            i = 1
            from .models import ShippingMethod as SM
            while SM.objects.filter(id=candidate).exists():
                i += 1
                candidate = f"{base}-{i}"
            validated_data['id'] = candidate
        return super().create(validated_data)
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Cart, CartItem, Coupon, CouponUsage, CartHistory, AbandonedCart, Order, OrderItem, OrderStatusHistory, StockMovement, Payment
from products.serializers import ProductListSerializer, ColorSerializer


class CartItemSerializer(serializers.ModelSerializer):
    """Serializer for cart items"""
    product = ProductListSerializer(read_only=True)
    color = ColorSerializer(read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, source='get_total_price')
    
    # For creating/updating items
    product_id = serializers.IntegerField(write_only=True)
    color_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'color', 'quantity', 'price', 'total_price',
            'added_at', 'updated_at', 'product_id', 'color_id'
        ]
        read_only_fields = ['id', 'price', 'added_at', 'updated_at']
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value
    
    def validate_product_id(self, value):
        from products.models import Product
        try:
            product = Product.objects.get(id=value, status='active')
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found or inactive")
    
    def validate_color_id(self, value):
        if value is None:
            return value
        
        from products.models import Color
        try:
            Color.objects.get(id=value, is_active=True)
            return value
        except Color.DoesNotExist:
            raise serializers.ValidationError("Color not found or inactive")


class CartSerializer(serializers.ModelSerializer):
    """Serializer for shopping cart"""
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True, source='get_total_items')
    applied_coupon_code = serializers.CharField(source='applied_coupon.code', read_only=True)
    
    class Meta:
        model = Cart
        fields = [
            'id', 'status', 'created_at', 'updated_at', 'last_activity',
            'subtotal', 'discount_amount', 'total', 'items', 'total_items',
            'applied_coupon_code'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'last_activity',
            'subtotal', 'discount_amount', 'total'
        ]


class AddToCartSerializer(serializers.Serializer):
    """Serializer for adding items to cart"""
    product_id = serializers.IntegerField()
    color_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(default=1, min_value=1)
    
    def validate_product_id(self, value):
        from products.models import Product
        try:
            product = Product.objects.get(id=value, status='active')
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found or inactive")
    
    def validate_color_id(self, value):
        if value is None:
            return value
        
        from products.models import Color
        try:
            Color.objects.get(id=value, is_active=True)
            return value
        except Color.DoesNotExist:
            raise serializers.ValidationError("Color not found or inactive")


class UpdateCartItemSerializer(serializers.Serializer):
    """Serializer for updating cart item quantities"""
    quantity = serializers.IntegerField(min_value=1)


class CouponSerializer(serializers.ModelSerializer):
    """Serializer for coupons - supports full CRUD for admin"""
    is_currently_valid = serializers.SerializerMethodField()
    usage_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'name', 'description', 'discount_type',
            'discount_value', 'minimum_amount', 'valid_from',
            'valid_until', 'max_uses', 'used_count', 'max_uses_per_user',
            'is_active', 'is_currently_valid', 'usage_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'used_count', 'created_at', 'updated_at']
    
    def get_is_currently_valid(self, obj):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        return obj.is_valid(user=user)
    
    def get_usage_percentage(self, obj):
        """Calculate usage percentage for coupons with max_uses"""
        if obj.max_uses:
            return round((obj.used_count / obj.max_uses) * 100, 2)
        return None


class ApplyCouponSerializer(serializers.Serializer):
    """Serializer for applying coupon to cart"""
    coupon_code = serializers.CharField(max_length=50)
    
    def validate_coupon_code(self, value):
        try:
            coupon = Coupon.objects.get(code=value)
            request = self.context.get('request')
            user = request.user if request and request.user.is_authenticated else None
            cart = self.context.get('cart')
            
            if not coupon.is_valid(user=user, cart_total=cart.subtotal if cart else None):
                raise serializers.ValidationError("Coupon is not valid")
            
            return value
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Coupon not found")


class CartHistorySerializer(serializers.ModelSerializer):
    """Serializer for cart history events"""
    
    class Meta:
        model = CartHistory
        fields = ['id', 'event', 'description', 'metadata', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class AbandonedCartSerializer(serializers.ModelSerializer):
    """Serializer for abandoned cart information"""
    cart = CartSerializer(read_only=True)
    
    class Meta:
        model = AbandonedCart
        fields = [
            'id', 'cart', 'recovery_emails_sent', 'last_recovery_sent',
            'recovered', 'recovered_at', 'abandonment_stage', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CartMergeSerializer(serializers.Serializer):
    """Serializer for merging carts during login"""
    anonymous_cart_data = serializers.JSONField(help_text="Local cart data to merge")
    
    def validate_anonymous_cart_data(self, value):
        # Validate the structure of the anonymous cart data
        if not isinstance(value, list):
            raise serializers.ValidationError("Cart data must be a list of items")
        
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Each item must be an object")
            
            required_fields = ['product_id', 'quantity']
            for field in required_fields:
                if field not in item:
                    raise serializers.ValidationError(f"Missing required field: {field}")
        
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for OrderItem with all product details"""
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'sku', 'product_image',
            'color', 'color_name', 'color_hex',
            'quantity', 'unit_price', 'subtotal',
            'weight', 'dimensions', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()
    is_delivered = serializers.ReadOnlyField()
    is_shipped = serializers.ReadOnlyField()
    can_be_cancelled = serializers.ReadOnlyField()
    shipping_address_display = serializers.CharField(source='get_shipping_address_display', read_only=True)
    customer_info = serializers.DictField(source='get_customer_info', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'cart', 'user', 'total_amount', 'shipping_cost', 
            'subtotal', 'status', 'shipping_method', 'shipping_address', 'billing_address',
            'tracking_number', 'estimated_delivery', 'delivered_at', 'notes', 'customer_notes',
            'created_at', 'updated_at', 'is_delivered', 'is_shipped', 'can_be_cancelled',
            'shipping_address_display', 'customer_info', 'items'
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.username', read_only=True)
    
    class Meta:
        model = OrderStatusHistory
        fields = ['id', 'order', 'old_status', 'new_status', 'changed_by', 'changed_by_name', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    color_name = serializers.CharField(source='color.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'color', 'color_name', 'order', 
            'movement_type', 'quantity', 'previous_stock', 'new_stock', 
            'notes', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'order', 'method', 'amount', 'currency', 'paysuite_reference', 'status', 'raw_response', 'created_at']
        read_only_fields = ['id', 'created_at', 'raw_response']