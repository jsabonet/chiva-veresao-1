from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Product, Color, ProductImage


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ['name', 'hex_code', 'color_preview', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'hex_code']
    readonly_fields = ['created_at', 'updated_at']
    
    def color_preview(self, obj):
        if obj.hex_code:
            return format_html(
                '<div style="width: 30px; height: 20px; background-color: {}; border: 1px solid #ccc;"></div>',
                obj.hex_code
            )
        return ''
    color_preview.short_description = 'Preview'


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ['image', 'alt_text', 'is_main', 'order']
    readonly_fields = ['created_at']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'product_count', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Nº de Produtos'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'sku', 'category', 'price', 'stock_quantity', 
        'status', 'is_featured', 'view_count', 'sales_count'
    ]
    list_filter = [
        'status', 'category', 'is_featured', 'is_bestseller', 
        'is_on_sale', 'created_at'
    ]
    search_fields = ['name', 'sku', 'brand', 'description']
    readonly_fields = [
        'slug', 'view_count', 'sales_count', 'created_at', 'updated_at'
    ]
    inlines = [ProductImageInline]
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': (
                'name', 'slug', 'sku', 'category', 'brand', 
                'description', 'short_description'
            )
        }),
        ('Preços e Estoque', {
            'fields': (
                'price', 'original_price', 'is_on_sale',
                'stock_quantity', 'min_stock_level'
            )
        }),
        ('Mídia', {
            'fields': ('main_image', 'image_2', 'image_3', 'image_4')
        }),
        ('Cores e Especificações', {
            'fields': ('colors', 'specifications', 'weight', 'length', 'width', 'height')
        }),
        ('Marketing', {
            'fields': (
                'is_featured', 'is_bestseller'
            )
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description')
        }),
        ('Status e Estatísticas', {
            'fields': (
                'status', 'view_count', 'sales_count', 
                'created_at', 'updated_at'
            )
        })
    )
    
    filter_horizontal = ['colors']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('category')
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating new product
            # You can add any custom logic here for new products
            pass
        super().save_model(request, obj, form, change)


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'image_preview', 'alt_text', 'is_main', 'order', 'created_at']
    list_filter = ['is_main', 'created_at', 'product__category']
    search_fields = ['product__name', 'alt_text']
    readonly_fields = ['created_at']
    list_editable = ['order', 'is_main']
    
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover;" />',
                obj.image.url
            )
        return ''
    image_preview.short_description = 'Preview'
