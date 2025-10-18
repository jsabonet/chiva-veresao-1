from cart.models import Coupon
from decimal import Decimal
from datetime import datetime, timedelta

# Criar cupons
coupons = [
    {
        'code': 'TESTE20',
        'name': 'Teste 20%',
        'description': '20% de desconto para testes',
        'discount_type': 'percentage',
        'discount_value': Decimal('20.00'),
        'valid_from': datetime.now(),
        'valid_until': datetime.now() + timedelta(days=90),
        'is_active': True,
    },
    {
        'code': 'OUT10',
        'name': 'Outubro 10%',
        'description': '10% de desconto válido em Outubro',
        'discount_type': 'percentage',
        'discount_value': Decimal('10.00'),
        'valid_from': datetime.now(),
        'valid_until': datetime.now() + timedelta(days=30),
        'is_active': True,
    },
    {
        'code': 'BEMVINDO50',
        'name': 'Boas-vindas 50 MZN',
        'description': '50 MZN de desconto',
        'discount_type': 'fixed',
        'discount_value': Decimal('50.00'),
        'minimum_amount': Decimal('200.00'),
        'valid_from': datetime.now(),
        'valid_until': datetime.now() + timedelta(days=90),
        'is_active': True,
    }
]

for data in coupons:
    coupon, created = Coupon.objects.get_or_create(
        code=data['code'],
        defaults=data
    )
    if created:
        print(f"Criado: {coupon.code}")
    else:
        print(f"Já existe: {coupon.code}")

print(f"\nTotal de cupons ativos: {Coupon.objects.filter(is_active=True).count()}")
