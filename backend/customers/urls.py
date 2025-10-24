from django.urls import path
from . import views

urlpatterns = [
    path('admin/customers/', views.CustomerListAdminView.as_view(), name='admin-customers'),
    path('admin/customers/create/', views.CustomerCreateAdminView.as_view(), name='admin-customer-create'),
    path('admin/customers/<str:user__username>/', views.CustomerDetailAdminView.as_view(), name='admin-customer-detail'),
    path('admin/customers/<str:customer_id>/delete/', views.customer_delete_admin, name='admin-customer-delete'),
    path('me/profile/', views.me_profile, name='me-profile'),
    # Roles and external user management
    path('admin/roles/', views.RoleListCreateAdminView.as_view(), name='admin_roles'),
    path('roles/', views.RoleListPublicView.as_view(), name='roles_list'),
    path('admin/external/<str:firebase_uid>/', views.external_user_detail, name='external_user_detail'),
    path('admin/external/<str:firebase_uid>/roles/', views.external_user_add_roles, name='external_user_add_roles'),
    path('admin/external/<str:firebase_uid>/roles/<int:role_id>/', views.external_user_remove_role, name='external_user_remove_role'),
    # Debug-only endpoint to inspect request.user and auth payload
    path('admin/debug/whoami/', views.debug_whoami, name='debug-whoami'),
    # Admin check endpoint
    path('admin/check/', views.admin_check, name='admin-check'),
    path('admin/check-status/', views.check_current_user_admin_status, name='admin-check-status'),
    # Admin permission management (frontend expects these endpoints)
    path('admin/customers/<str:customer_id>/grant-admin/', views.customer_grant_admin, name='customer-grant-admin'),
    path('admin/customers/<str:customer_id>/revoke-admin/', views.customer_revoke_admin, name='customer-revoke-admin'),
    path('admin/customers/<str:customer_id>/permission-history/', views.customer_permission_history, name='customer-permission-history'),
    path('admin/customers/<str:customer_id>/sync-firebase/', views.customer_sync_firebase, name='customer-sync-firebase'),
]
