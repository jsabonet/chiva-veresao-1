from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'images', views.ProductImageViewSet, basename='productimage')

urlpatterns = [
    # Categories URLs
    path('categories/', views.CategoryListCreateView.as_view(), name='category-list-create'),
    path('categories/<int:pk>/', views.CategoryDetailView.as_view(), name='category-detail'),
    
    # Colors URLs
    path('colors/', views.ColorListCreateView.as_view(), name='color-list-create'),
    path('colors/<int:pk>/', views.ColorDetailView.as_view(), name='color-detail'),
    
    # Product Images URLs (ViewSet routes)
    path('', include(router.urls)),
    
    # Special product endpoints (must come before generic product endpoints)
    path('products/featured/', views.featured_products, name='featured-products'),
    path('products/bestsellers/', views.bestseller_products, name='bestseller-products'),
    path('products/sale/', views.sale_products, name='sale-products'),
    path('products/stats/', views.product_stats, name='product-stats'),
    path('products/category/<int:category_id>/', views.products_by_category, name='products-by-category'),
    path('products/search/', views.search_products, name='search-products'),
    
    # Generic Products URLs (must come after specific endpoints)
    path('products/', views.ProductListCreateView.as_view(), name='product-list-create'),
    path('products/id/<int:pk>/', views.ProductByIdDetailView.as_view(), name='product-detail-by-id'),
    path('products/<slug:slug>/', views.ProductDetailView.as_view(), name='product-detail'),
]
