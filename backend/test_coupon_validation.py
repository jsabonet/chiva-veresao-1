#!/usr/bin/env python
"""
Test coupon validation with cart_total parameter
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from decimal import Decimal
from cart.models import Coupon

print("=" * 60)
print("TESTE: Validação de Cupom com Cart Total")
print("=" * 60)

# Get test coupons
coupons = Coupon.objects.filter(is_active=True)[:3]

test_amounts = [
    Decimal('100.00'),
    Decimal('500.00'),
    Decimal('1000.00'),
    Decimal('5000.00'),
]

print(f"\nCupons ativos: {coupons.count()}")
print("\nTestando com diferentes valores de carrinho:\n")

for coupon in coupons:
    print(f"--- {coupon.code} - {coupon.name} ---")
    print(f"Tipo: {coupon.discount_type} | Valor: {coupon.discount_value}")
    if coupon.minimum_amount:
        print(f"Mínimo: {coupon.minimum_amount} MZN")
    
    for amount in test_amounts:
        is_valid = coupon.is_valid(cart_total=amount)
        if is_valid:
            discount = coupon.calculate_discount(amount)
            final = amount - discount
            print(f"  Carrinho {amount:>8} MZN → Desconto {discount:>8} MZN = Total {final:>8} MZN ✓")
        else:
            reason = []
            if coupon.minimum_amount and amount < coupon.minimum_amount:
                reason.append(f"mínimo {coupon.minimum_amount}")
            if not reason:
                reason.append("outros critérios")
            print(f"  Carrinho {amount:>8} MZN → Inválido ({', '.join(reason)}) ✗")
    print()

print("=" * 60)
print("TESTE DE API (simulado)")
print("=" * 60)
print("\nExemplos de chamadas API:\n")

for coupon in coupons[:2]:
    for amount in [100, 1000]:
        print(f"GET /api/cart/coupon/validate/?code={coupon.code}&cart_total={amount}")
        is_valid = coupon.is_valid(cart_total=Decimal(str(amount)))
        discount = coupon.calculate_discount(Decimal(str(amount))) if is_valid else 0
        print(f"  → valid: {is_valid}, discount_amount: {discount}")
        print()

print("=" * 60)
print("\nPara testar via curl:")
print("curl 'http://127.0.0.1:8000/api/cart/coupon/validate/?code=TESTE20&cart_total=1000'")
print("\nEm produção:")
print("curl 'https://chivacomputer.co.mz/api/cart/coupon/validate/?code=TESTE20&cart_total=1000'")
print("=" * 60)
