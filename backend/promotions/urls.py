from django.urls import path
from . import views

urlpatterns = [
    path('admin/promotions/', views.PromotionListCreateAdminView.as_view(), name='admin-promotions'),
    path('admin/promotions/<int:pk>/', views.PromotionDetailAdminView.as_view(), name='admin-promotion-detail'),
    path('promotions/', views.PromotionPublicListView.as_view(), name='public-promotions'),
]
