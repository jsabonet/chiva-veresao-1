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
    # Subcategories URLs
    path('subcategories/', views.SubcategoryListCreateView.as_view(), name='subcategory-list-create'),
    path('subcategories/<int:pk>/', views.SubcategoryDetailView.as_view(), name='subcategory-detail'),
    path('categories/<int:category_id>/subcategories/', views.subcategories_by_category, name='subcategories-by-category'),
    
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
    path('products/id/<int:pk>/duplicate/', views.duplicate_product, name='product-duplicate'),
    
    # Generic Products URLs (must come after specific endpoints)
    # Reviews URLs (place before the generic slug route to avoid conflicts with product slugs)
    path('products/<int:product_id>/reviews/', views.ReviewListCreateView.as_view(), name='review-list-create'),
    path('reviews/<int:pk>/', views.ReviewDetailView.as_view(), name='review-detail'),
    path('reviews/<int:pk>/helpful/', views.review_toggle_helpful, name='review-helpful'),
    # Admin review listing and moderation
    path('products/reviews/', views.review_admin_list, name='review-admin-list'),
    path('products/reviews/<int:pk>/moderate/', views.review_moderate, name='review-moderate'),

    path('products/', views.ProductListCreateView.as_view(), name='product-list-create'),
    path('products/id/<int:pk>/', views.ProductByIdDetailView.as_view(), name='product-detail-by-id'),
    path('products/<slug:slug>/', views.ProductDetailView.as_view(), name='product-detail'),
    
    # Favorites URLs
    path('favorites/', views.FavoriteListCreateView.as_view(), name='favorite-list-create'),
    path('favorites/<int:pk>/', views.FavoriteDetailView.as_view(), name='favorite-detail'),
    path('favorites/toggle/<int:product_id>/', views.toggle_favorite, name='toggle-favorite'),
    path('favorites/check/<int:product_id>/', views.check_favorite_status, name='check-favorite'),
    

    # Auth debug
    path('auth/ping/', views.auth_ping, name='auth-ping'),
    path('auth/token-payload/', views.auth_token_payload, name='auth-token-payload'),
]
