import os
import django
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from products.models import Product, ProductImage  # noqa
from products.image_utils import generate_webp_variants  # noqa


def backfill():
    total = 0
    for p in Product.objects.all():
        for field in ["main_image", "image_2", "image_3", "image_4"]:
            f = getattr(p, field, None)
            if f and getattr(f, 'path', None) and os.path.exists(f.path):
                generate_webp_variants(f.path)
                total += 1
    for pi in ProductImage.objects.all():
        f = getattr(pi, 'image', None)
        if f and getattr(f, 'path', None) and os.path.exists(f.path):
            generate_webp_variants(f.path)
            total += 1
    print(f"Backfilled variants for {total} images.")


if __name__ == "__main__":
    backfill()
