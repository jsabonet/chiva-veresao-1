#!/usr/bin/env python
"""
Update old coupon dates to make them valid
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
from cart.models import Coupon

def update_old_coupons():
    """Update old coupons to have valid dates"""
    print("Atualizando datas de cupons antigos...")
    
    # Update DESCONTO10
    try:
        coupon = Coupon.objects.get(code='DESCONTO10')
        coupon.valid_from = timezone.now()
        coupon.valid_until = timezone.now() + timedelta(days=30)
        coupon.minimum_amount = 500  # Update to 500 MZN
        coupon.save()
        print(f"✓ Atualizado: {coupon.code}")
    except Coupon.DoesNotExist:
        print("✗ DESCONTO10 não encontrado")
    
    # Update SAVE20
    try:
        coupon = Coupon.objects.get(code='SAVE20')
        coupon.valid_from = timezone.now()
        coupon.valid_until = timezone.now() + timedelta(days=15)
        coupon.save()
        print(f"✓ Atualizado: {coupon.code}")
    except Coupon.DoesNotExist:
        print("✗ SAVE20 não encontrado")
    
    # Update EXPIRED (keep it expired for testing)
    try:
        coupon = Coupon.objects.get(code='EXPIRED')
        # Keep expired
        print(f"• Mantido expirado: {coupon.code}")
    except Coupon.DoesNotExist:
        print("✗ EXPIRED não encontrado")
    
    print("\nCupons atualizados com sucesso!")

if __name__ == '__main__':
    update_old_coupons()
