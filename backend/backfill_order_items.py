"""
Backfill script: create OrderItems for existing Orders without items.
- Uses Payment.request_data['items'] when available
- Falls back to linked cart items
Run inside the container or with DJANGO_SETTINGS_MODULE configured.
"""
import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Order, Payment, OrderItem

from django.db import transaction

def backfill():
    qs = Order.objects.filter(items__isnull=True)
    total = qs.count()
    print(f"Found {total} orders without items")
    fixed = 0
    for order in qs:
        try:
            with transaction.atomic():
                # Prefer the latest payment for this order
                payment = Payment.objects.filter(order=order).order_by('-created_at').first()
                items_payload = []
                if payment and payment.request_data:
                    items_payload = payment.request_data.get('items') or []

                created = 0
                if items_payload:
                    print(f"Order {order.id}: creating {len(items_payload)} items from payment.request_data")
                    for it in items_payload:
                        try:
                            qty = int(it.get('quantity', 1))
                            unit_price = Decimal(str(it.get('unit_price') or it.get('price') or '0'))
                            OrderItem.objects.create(
                                order=order,
                                product_id=it.get('product_id') or it.get('product'),
                                product_name=it.get('name', ''),
                                sku=it.get('sku', ''),
                                product_image=it.get('product_image', ''),
                                color_id=it.get('color_id') or it.get('color'),
                                color_name=it.get('color_name', ''),
                                quantity=qty,
                                unit_price=unit_price,
                                subtotal=unit_price * qty,
                            )
                            created += 1
                        except Exception as e:
                            print(f"  ❌ Failed to create item from payment: {e}")
                elif order.cart and order.cart.items.exists():
                    print(f"Order {order.id}: creating items from cart {order.cart.id}")
                    for ci in order.cart.items.all():
                        try:
                            OrderItem.objects.create(
                                order=order,
                                product_id=ci.product.id if ci.product else None,
                                product_name=ci.product.name if ci.product else '',
                                sku=getattr(ci.product, 'sku', ''),
                                color_id=ci.color.id if ci.color else None,
                                color_name=ci.color.name if ci.color else '',
                                quantity=ci.quantity,
                                unit_price=ci.price,
                                subtotal=ci.price * ci.quantity,
                            )
                            created += 1
                        except Exception as e:
                            print(f"  ❌ Failed to create item from cart: {e}")
                
                if created:
                    fixed += 1
                    print(f"  ✅ Created {created} items for order {order.order_number}")
                else:
                    print(f"  ⚠️ No items found to create for order {order.order_number}")
        except Exception as e:
            print(f"❌ Error processing order {order.id}: {e}")
    print(f"Done. Orders fixed: {fixed}/{total}")

if __name__ == "__main__":
    backfill()
