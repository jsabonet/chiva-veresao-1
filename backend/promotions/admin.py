from django.contrib import admin
from .models import Promotion


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
	list_display = ('name', 'status', 'start_date', 'end_date', 'discount_type', 'discount_value')
	list_filter = ('status', 'discount_type', 'start_date', 'end_date')
	search_fields = ('name', 'description')
	filter_horizontal = ('allowed_roles',)
