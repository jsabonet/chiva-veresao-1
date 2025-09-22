from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Cart, CartItem, Coupon, CouponUsage, CartHistory, AbandonedCart


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user_display', 'status', 'total_items_display',
        'subtotal', 'discount_amount', 'total', 'last_activity',
        'view_items_link'
    ]
    list_filter = ['status', 'created_at', 'last_activity']
    search_fields = ['user__username', 'user__email', 'session_key']
    readonly_fields = ['subtotal', 'discount_amount', 'total', 'recovery_token']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'session_key', 'status')
        }),
        ('Totals', {
            'fields': ('subtotal', 'discount_amount', 'total', 'applied_coupon')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_activity')
        }),
        ('Recovery', {
            'fields': ('recovery_email_sent', 'recovery_email_sent_at', 'recovery_token'),
            'classes': ('collapse',)
        })
    )
    
    def user_display(self, obj):
        if obj.user:
            return f"{obj.user.username} ({obj.user.email})"
        return f"Anonymous ({obj.session_key[:8]}...)" if obj.session_key else "Unknown"
    user_display.short_description = "User"
    
    def total_items_display(self, obj):
        return obj.get_total_items()
    total_items_display.short_description = "Items"
    
    def view_items_link(self, obj):
        url = reverse('admin:cart_cartitem_changelist') + f'?cart__id__exact={obj.id}'
        return format_html('<a href="{}">View Items</a>', url)
    view_items_link.short_description = "Items"


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'cart_display', 'product', 'color', 'quantity',
        'price', 'total_price_display', 'added_at'
    ]
    list_filter = ['added_at', 'product__category']
    search_fields = ['product__name', 'cart__user__username']
    
    def cart_display(self, obj):
        if obj.cart.user:
            return f"Cart #{obj.cart.id} ({obj.cart.user.username})"
        return f"Cart #{obj.cart.id} (Anonymous)"
    cart_display.short_description = "Cart"
    
    def total_price_display(self, obj):
        return obj.get_total_price()
    total_price_display.short_description = "Total"


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'name', 'discount_display', 'used_count', 'max_uses',
        'valid_from', 'valid_until', 'is_active', 'current_status'
    ]
    list_filter = ['discount_type', 'is_active', 'created_at', 'valid_from']
    search_fields = ['code', 'name']
    readonly_fields = ['used_count']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'description', 'is_active')
        }),
        ('Discount Configuration', {
            'fields': ('discount_type', 'discount_value', 'minimum_amount')
        }),
        ('Usage Limits', {
            'fields': ('max_uses', 'used_count', 'max_uses_per_user')
        }),
        ('Validity Period', {
            'fields': ('valid_from', 'valid_until')
        })
    )
    
    def discount_display(self, obj):
        if obj.discount_type == 'percentage':
            return f"{obj.discount_value}%"
        return f"${obj.discount_value}"
    discount_display.short_description = "Discount"
    
    def current_status(self, obj):
        if obj.is_valid():
            return format_html('<span style="color: green;">Valid</span>')
        return format_html('<span style="color: red;">Invalid</span>')
    current_status.short_description = "Status"


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = ['id', 'coupon', 'user', 'cart', 'used_at']
    list_filter = ['used_at', 'coupon']
    search_fields = ['user__username', 'coupon__code']


@admin.register(CartHistory)
class CartHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'cart_display', 'event', 'description', 'timestamp']
    list_filter = ['event', 'timestamp']
    search_fields = ['cart__user__username', 'description']
    readonly_fields = ['timestamp']
    
    def cart_display(self, obj):
        if obj.cart.user:
            return f"Cart #{obj.cart.id} ({obj.cart.user.username})"
        return f"Cart #{obj.cart.id} (Anonymous)"
    cart_display.short_description = "Cart"


@admin.register(AbandonedCart)
class AbandonedCartAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'cart_display', 'abandonment_stage', 'recovery_emails_sent',
        'last_recovery_sent', 'recovered', 'created_at'
    ]
    list_filter = ['abandonment_stage', 'recovered', 'created_at']
    search_fields = ['cart__user__username']
    readonly_fields = ['created_at']
    
    actions = ['mark_as_recovered', 'send_recovery_email']
    
    def cart_display(self, obj):
        if obj.cart.user:
            return f"Cart #{obj.cart.id} ({obj.cart.user.username})"
        return f"Cart #{obj.cart.id} (Anonymous)"
    cart_display.short_description = "Cart"
    
    def mark_as_recovered(self, request, queryset):
        from django.utils import timezone
        count = queryset.update(recovered=True, recovered_at=timezone.now())
        self.message_user(request, f"{count} abandoned carts marked as recovered.")
    mark_as_recovered.short_description = "Mark selected carts as recovered"
    
    def send_recovery_email(self, request, queryset):
        # This would integrate with your email system
        from django.utils import timezone
        count = 0
        for abandoned_cart in queryset:
            if abandoned_cart.should_send_recovery_email():
                # Send email logic would go here
                abandoned_cart.recovery_emails_sent += 1
                abandoned_cart.last_recovery_sent = timezone.now()
                abandoned_cart.save()
                count += 1
        
        self.message_user(request, f"Recovery emails sent for {count} carts.")
    send_recovery_email.short_description = "Send recovery emails"
