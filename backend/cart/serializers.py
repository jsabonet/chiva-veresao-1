from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Cart, CartItem, Coupon, CouponUsage, CartHistory, AbandonedCart
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
    """Serializer for coupons"""
    is_currently_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'name', 'description', 'discount_type',
            'discount_value', 'minimum_amount', 'valid_from',
            'valid_until', 'is_active', 'is_currently_valid'
        ]
        read_only_fields = ['id']
    
    def get_is_currently_valid(self, obj):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        return obj.is_valid(user=user)


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


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = __import__('cart.models', fromlist=['Order']).Order
        fields = ['id', 'cart', 'user', 'total_amount', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = __import__('cart.models', fromlist=['Payment']).Payment
        fields = ['id', 'order', 'method', 'amount', 'currency', 'paysuite_reference', 'status', 'raw_response', 'created_at']
        read_only_fields = ['id', 'created_at', 'raw_response']