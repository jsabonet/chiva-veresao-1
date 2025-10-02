from django.urls import path
from . import views

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
]