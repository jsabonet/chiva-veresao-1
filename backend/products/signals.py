from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Product, ProductImage
from .image_utils import generate_webp_variants


def _ensure_variants_for_field(instance, field_name: str):
    file_field = getattr(instance, field_name, None)
    try:
        if file_field and getattr(file_field, 'path', None):
            generate_webp_variants(file_field.path)
    except Exception:
        pass


@receiver(post_save, sender=ProductImage)
def productimage_post_save(sender, instance: ProductImage, created, **kwargs):
    _ensure_variants_for_field(instance, 'image')


@receiver(post_save, sender=Product)
def product_post_save(sender, instance: Product, created, **kwargs):
    for field in ['main_image', 'image_2', 'image_3', 'image_4']:
        _ensure_variants_for_field(instance, field)
