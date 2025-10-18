#!/bin/bash
# Script para testar cupons em produção

cd /home/chiva/chiva-veresao-1/backend
source venv/bin/activate

echo "=== Verificando cupons ativos ==="
python manage.py shell << EOF
from cart.models import Coupon
from decimal import Decimal

print("\nCupons cadastrados:")
for c in Coupon.objects.all()[:10]:
    print(f"  {c.code}: {c.name} - Ativo: {c.is_active} - Válido até: {c.valid_until}")

print("\n=== Testando TESTE20 ===")
try:
    coupon = Coupon.objects.get(code='TESTE20')
    print(f"Cupom encontrado: {coupon.name}")
    print(f"Tipo: {coupon.discount_type}, Valor: {coupon.discount_value}")
    print(f"Ativo: {coupon.is_active}")
    
    cart_total = Decimal('1000')
    is_valid = coupon.is_valid(cart_total=cart_total)
    print(f"\nValidação para R\$ 1000:")
    print(f"  is_valid: {is_valid}")
    if is_valid:
        discount = coupon.calculate_discount(cart_total)
        print(f"  discount: {discount}")
except Coupon.DoesNotExist:
    print("Cupom TESTE20 não encontrado!")
except Exception as e:
    print(f"Erro: {e}")
    import traceback
    traceback.print_exc()
EOF
