#!/usr/bin/env python
"""Script para verificar status do Payment #23"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment, Order
import json

try:
    payment = Payment.objects.get(id=23)
    print(f"\n📍 Payment #{payment.id}")
    print(f"   Status: {payment.status}")
    print(f"   Method: {payment.method}")
    print(f"   Amount: {payment.amount}")
    print(f"   PaySuite Ref: {payment.paysuite_reference}")
    print(f"\n📋 Raw Response:")
    print(json.dumps(payment.raw_response, indent=2))
    
    # Check order
    if hasattr(payment.cart, 'order'):
        order = payment.cart.order
        print(f"\n📦 Order #{order.id}")
        print(f"   Status: {order.status}")
    else:
        print("\n⚠️  Sem Order associada")
        
except Payment.DoesNotExist:
    print("❌ Payment #23 não encontrado")
except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()
