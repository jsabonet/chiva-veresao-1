"""
URL configuration for chiva_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.contrib.sitemaps.views import sitemap
from products.sitemaps import ProductSitemap, CategorySitemap, SubcategorySitemap, StaticViewSitemap
from cart import order_views as cart_order_views

urlpatterns = [
    path("admin/", admin.site.urls),
    # Direct export endpoints (ensure no include-order confusion during dev/testing)
    path('api/cart/admin/export/orders/', cart_order_views.export_orders, name='export_orders_root'),
    path('api/cart/admin/export/orders/debug/', cart_order_views.export_orders_debug, name='export_orders_debug'),
    path('api/cart/admin/export/customers/', cart_order_views.export_customers, name='export_customers_root'),
    path('api/cart/admin/export/dashboard/', cart_order_views.export_dashboard_stats, name='export_dashboard_stats_root'),
    # Otherwise, 'api/' will match first and delegate, causing 404s for 'api/cart/...'
    path("api/cart/", include("cart.urls")),
    path("api/", include("products.urls")),
    path("api/", include("customers.urls")),
    path("api/", include("promotions.urls")),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # Sitemap
    path('sitemap.xml', sitemap, {'sitemaps': {
        'products': ProductSitemap(),
        'categories': CategorySitemap(),
        'subcategories': SubcategorySitemap(),
        'static': StaticViewSitemap(),
    }}, name='sitemap'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)


