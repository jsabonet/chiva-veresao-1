from django.contrib import admin
from .models import CustomerProfile, Role, ExternalAuthUser

@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'email_display', 'phone', 'status', 'registration_date')
    search_fields = ('user__username', 'user__email', 'phone')

    def email_display(self, obj):
        return obj.user.email if obj.user else ''

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name',)

@admin.register(ExternalAuthUser)
class ExternalAuthUserAdmin(admin.ModelAdmin):
    list_display = ('firebase_uid', 'email', 'display_name', 'is_admin', 'last_seen')
    search_fields = ('firebase_uid', 'email', 'display_name')
    filter_horizontal = ('roles',)
