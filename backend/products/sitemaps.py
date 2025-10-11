from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from .models import Product, Category, Subcategory


class ProductSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.9

    def items(self):
        # Only include active products
        return Product.objects.filter(status='active')

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        # Uses the product detail url pattern which expects a slug
        return reverse('product-detail', kwargs={'slug': obj.slug})


class CategorySitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.7

    def items(self):
        return Category.objects.filter(is_active=True)

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        # The frontend likely builds category pages at /categories/<id>/ or similar;
        # On the API side we expose a category endpoint so include a stable URL
        return reverse('category-detail', kwargs={'pk': obj.pk})


class SubcategorySitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.6

    def items(self):
        return Subcategory.objects.all()

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        return reverse('subcategory-detail', kwargs={'pk': obj.pk})


class StaticViewSitemap(Sitemap):
    changefreq = "daily"
    priority = 0.5

    def items(self):
        # Add named views that should be discoverable. These should correspond
        # to frontend routes or API endpoints; keep them minimal so crawlers see root pages.
        return ['product-list-create', 'featured-products', 'bestseller-products', 'sale-products']

    def location(self, item):
        try:
            return reverse(item)
        except Exception:
            # Fallback to root if named route missing
            return '/'
