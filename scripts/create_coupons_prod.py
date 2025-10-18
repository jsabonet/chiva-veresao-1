#!/usr/bin/env python3
"""
Criar cupons de teste em produção
"""
import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django
sys.path.insert(0, '/home/chiva/chiva-veresao-1/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Coupon
from decimal import Decimal

def create_coupons():
    print("=" * 60)
    print("CRIANDO CUPONS DE TESTE EM PRODUÇÃO")
    print("=" * 60)
    
    coupons_data = [
        {
            'code': 'TESTE20',
            'name': 'Teste 20%',
            'description': 'Cupom de teste com 20% de desconto',
            'discount_type': 'percentage',
            'discount_value': Decimal('20.00'),
            'valid_from': datetime.now(),
            'valid_until': datetime.now() + timedelta(days=90),
            'is_active': True,
        },
        {
            'code': 'OUT10',
            'name': 'Cupom do Mês de Outubro 10%',
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
            'description': '50 MZN de desconto para novos clientes',
            'discount_type': 'fixed',
            'discount_value': Decimal('50.00'),
            'minimum_amount': Decimal('200.00'),
            'valid_from': datetime.now(),
            'valid_until': datetime.now() + timedelta(days=90),
            'is_active': True,
        },
    ]
    
    for data in coupons_data:
        try:
            coupon, created = Coupon.objects.get_or_create(
                code=data['code'],
                defaults=data
            )
            if created:
                print(f"✅ Criado: {coupon.code} - {coupon.name}")
            else:
                # Atualizar se já existe
                for key, value in data.items():
                    setattr(coupon, key, value)
                coupon.save()
                print(f"🔄 Atualizado: {coupon.code} - {coupon.name}")
        except Exception as e:
            print(f"❌ Erro ao criar {data['code']}: {e}")
    
    print("\n" + "=" * 60)
    print("CUPONS CADASTRADOS:")
    print("=" * 60)
    for coupon in Coupon.objects.filter(is_active=True):
        print(f"  {coupon.code}: {coupon.name}")
        print(f"    Tipo: {coupon.discount_type} | Valor: {coupon.discount_value}")
        print(f"    Válido até: {coupon.valid_until}")
    print("=" * 60)

if __name__ == "__main__":
    create_coupons()
