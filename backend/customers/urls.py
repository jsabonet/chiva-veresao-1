from django.urls import path
from . import views

urlpatterns = [
    path('admin/customers/', views.CustomerListAdminView.as_view(), name='admin-customers'),
    path('admin/customers/create/', views.CustomerCreateAdminView.as_view(), name='admin-customer-create'),
    path('admin/customers/<str:user__username>/', views.CustomerDetailAdminView.as_view(), name='admin-customer-detail'),
    path('me/profile/', views.me_profile, name='me-profile'),
]
