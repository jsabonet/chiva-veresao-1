from django.urls import path
from . import views
from . import order_views

urlpatterns = [
    # Main cart operations
    path('', views.CartAPIView.as_view(), name='cart'),
    
    # Cart item operations
    path('items/<int:item_id>/', views.CartItemAPIView.as_view(), name='cart-item'),
    
    # Coupon operations
    path('coupon/', views.CouponAPIView.as_view(), name='cart-coupon'),
    path('coupon/validate/', views.validate_coupon, name='validate-coupon'),
    
    # Cart synchronization
    path('merge/', views.merge_cart, name='merge-cart'),
    path('sync/', views.sync_cart, name='sync-cart'),
    
    # Abandoned carts (admin)
    path('abandoned/', views.abandoned_carts, name='abandoned-carts'),
    # Payments
    path('payments/initiate/', views.initiate_payment, name='payments-initiate'),
    path('payments/webhook/', views.paysuite_webhook, name='payments-webhook'),
    path('payments/status/<int:order_id>/', views.payment_status, name='payments-status'),
    # Debug endpoints
    path('debug/add-item/', views.debug_add_to_cart, name='debug-add-to-cart'),
    path('debug/clear-carts/', views.debug_clear_carts, name='debug-clear-carts'),
    path('debug/list-carts/', views.debug_list_carts, name='debug-list-carts'),
    path('debug/fix-cart-prices/', views.debug_fix_all_cart_prices, name='debug-fix-cart-prices'),
    path('debug/set-low-prices/', views.debug_set_low_prices, name='debug-set-low-prices'),
    
    # Order Management - User
    path('orders/', order_views.user_orders, name='user_orders'),
    path('orders/<int:order_id>/', order_views.order_detail, name='order_detail'),
    path('orders/<int:order_id>/cancel/', order_views.cancel_order, name='cancel_order'),
    path('orders/<int:order_id>/items/', order_views.order_items, name='order_items'),
    path('orders/<int:order_id>/status/', order_views.admin_update_order_status, name='update_order_status'),
    path('orders/<int:order_id>/tracking/', order_views.admin_update_order_tracking, name='update_order_tracking'),
    path('orders/<int:order_id>/notes/', order_views.admin_update_order_notes, name='update_order_notes'),
    
    # Order Management - Admin
    path('admin/orders/', order_views.admin_orders_list, name='admin_orders_list'),
    path('admin/orders/<int:order_id>/status/', order_views.admin_update_order_status, name='admin_update_order_status'),
    path('admin/orders/stats/', order_views.admin_orders_stats, name='admin_orders_stats'),
    
    # Stock Management - Admin
    path('admin/stock/report/', order_views.stock_report, name='stock_report'),
    path('admin/stock/adjust/', order_views.adjust_stock, name='adjust_stock'),
    
    # Coupon Management - Admin
    path('admin/coupons/', views.admin_coupons_list_create, name='admin_coupons_list_create'),
    path('admin/coupons/<int:coupon_id>/', views.admin_coupon_detail, name='admin_coupon_detail'),
    path('admin/coupons/stats/', views.admin_coupon_stats, name='admin_coupon_stats'),

    # Shipping methods management (admin)
    path('admin/shipping-methods/', views.shipping_methods_list_create, name='shipping_methods_list_create'),
    path('admin/shipping-methods/<str:method_id>/', views.shipping_method_detail, name='shipping_method_detail'),
    # Public list for checkout
    path('shipping-methods/', views.shipping_methods_public_list, name='shipping_methods_public_list'),
    
    # Export endpoints (admin)
    path('admin/export/orders/', order_views.export_orders, name='export_orders'),
    path('admin/export/customers/', order_views.export_customers, name='export_customers'),
    path('admin/export/dashboard/', order_views.export_dashboard_stats, name='export_dashboard_stats'),
]