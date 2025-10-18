#!/usr/bin/env python
"""
Script to test the coupon system
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from cart.models import Coupon

def list_coupons():
    """List all existing coupons"""
    print("\n=== CUPONS EXISTENTES ===")
    coupons = Coupon.objects.all()
    
    if not coupons.exists():
        print("Nenhum cupom encontrado.")
        return
    
    for coupon in coupons:
        status = "✓ ATIVO" if coupon.is_active else "✗ INATIVO"
        valid = "✓ VÁLIDO" if coupon.is_valid() else "✗ INVÁLIDO"
        usage = f"{coupon.used_count}/{coupon.max_uses or '∞'}"
        
        print(f"\n{coupon.code} - {coupon.name} [{status}] [{valid}]")
        print(f"  Tipo: {coupon.discount_type} | Valor: {coupon.discount_value}")
        print(f"  Válido de {coupon.valid_from.strftime('%d/%m/%Y')} até {coupon.valid_until.strftime('%d/%m/%Y')}")
        print(f"  Usos: {usage}")
        if coupon.minimum_amount:
            print(f"  Mínimo: {coupon.minimum_amount} MZN")

def create_test_coupons():
    """Create test coupons if they don't exist"""
    print("\n=== CRIANDO CUPONS DE TESTE ===")
    
    # Cupom 1: 10% de desconto
    coupon1, created = Coupon.objects.get_or_create(
        code='DESCONTO10',
        defaults={
            'name': 'Desconto de 10%',
            'description': 'Ganhe 10% de desconto em compras acima de 500 MZN',
            'discount_type': 'percentage',
            'discount_value': Decimal('10.00'),
            'valid_from': timezone.now(),
            'valid_until': timezone.now() + timedelta(days=30),
            'minimum_amount': Decimal('500.00'),
            'max_uses': 100,
            'is_active': True,
        }
    )
    if created:
        print(f"✓ Criado: {coupon1.code}")
    else:
        print(f"• Já existe: {coupon1.code}")
    
    # Cupom 2: 50 MZN de desconto
    coupon2, created = Coupon.objects.get_or_create(
        code='BEMVINDO50',
        defaults={
            'name': 'Bem-vindo! 50 MZN OFF',
            'description': 'Desconto de 50 MZN para novos clientes',
            'discount_type': 'fixed',
            'discount_value': Decimal('50.00'),
            'valid_from': timezone.now(),
            'valid_until': timezone.now() + timedelta(days=60),
            'minimum_amount': Decimal('200.00'),
            'max_uses': None,  # Ilimitado
            'max_uses_per_user': 1,  # Uma vez por usuário
            'is_active': True,
        }
    )
    if created:
        print(f"✓ Criado: {coupon2.code}")
    else:
        print(f"• Já existe: {coupon2.code}")
    
    # Cupom 3: 20% sem mínimo (para testes)
    coupon3, created = Coupon.objects.get_or_create(
        code='TESTE20',
        defaults={
            'name': 'Teste 20%',
            'description': 'Cupom de teste com 20% sem valor mínimo',
            'discount_type': 'percentage',
            'discount_value': Decimal('20.00'),
            'valid_from': timezone.now(),
            'valid_until': timezone.now() + timedelta(days=7),
            'minimum_amount': None,
            'max_uses': 10,
            'is_active': True,
        }
    )
    if created:
        print(f"✓ Criado: {coupon3.code}")
    else:
        print(f"• Já existe: {coupon3.code}")
    
    # Cupom 4: Expirado (para testar validação)
    coupon4, created = Coupon.objects.get_or_create(
        code='EXPIRADO',
        defaults={
            'name': 'Cupom Expirado (Teste)',
            'description': 'Este cupom está expirado para testes',
            'discount_type': 'percentage',
            'discount_value': Decimal('50.00'),
            'valid_from': timezone.now() - timedelta(days=10),
            'valid_until': timezone.now() - timedelta(days=1),
            'is_active': True,
        }
    )
    if created:
        print(f"✓ Criado: {coupon4.code}")
    else:
        print(f"• Já existe: {coupon4.code}")

def test_coupon_validation():
    """Test coupon validation logic"""
    print("\n=== TESTANDO VALIDAÇÃO DE CUPONS ===")
    
    # Test with 1000 MZN cart
    cart_total = Decimal('1000.00')
    print(f"\nCarrinho de teste: {cart_total} MZN")
    
    for coupon in Coupon.objects.all():
        is_valid = coupon.is_valid(cart_total=cart_total)
        if is_valid:
            discount = coupon.calculate_discount(cart_total)
            final_total = cart_total - discount
            print(f"  ✓ {coupon.code}: Desconto de {discount} MZN (Total: {final_total} MZN)")
        else:
            reasons = []
            if not coupon.is_active:
                reasons.append("inativo")
            if timezone.now() < coupon.valid_from or timezone.now() > coupon.valid_until:
                reasons.append("fora do período")
            if coupon.minimum_amount and cart_total < coupon.minimum_amount:
                reasons.append(f"mínimo {coupon.minimum_amount} MZN")
            if coupon.max_uses and coupon.used_count >= coupon.max_uses:
                reasons.append("limite de usos atingido")
            
            print(f"  ✗ {coupon.code}: Inválido ({', '.join(reasons)})")

def main():
    print("=" * 60)
    print("TESTE DO SISTEMA DE CUPONS")
    print("=" * 60)
    
    # List existing coupons
    list_coupons()
    
    # Create test coupons
    create_test_coupons()
    
    # List again after creation
    list_coupons()
    
    # Test validation
    test_coupon_validation()
    
    print("\n" + "=" * 60)
    print("INSTRUÇÕES PARA TESTAR:")
    print("=" * 60)
    print("1. Acesse http://localhost:5173/admin/settings")
    print("2. Vá para a aba 'Cupons de Desconto'")
    print("3. Veja os cupons criados e teste editar/criar novos")
    print("4. Adicione produtos ao carrinho em http://localhost:5173")
    print("5. No carrinho, teste aplicar os códigos:")
    print("   - DESCONTO10 (10% com mínimo de 500 MZN)")
    print("   - BEMVINDO50 (50 MZN com mínimo de 200 MZN)")
    print("   - TESTE20 (20% sem mínimo)")
    print("   - EXPIRADO (deve ser rejeitado)")
    print("6. Verifique se os descontos são aplicados corretamente")
    print("=" * 60)

if __name__ == '__main__':
    main()
