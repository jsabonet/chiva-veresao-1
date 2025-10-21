#!/usr/bin/env python
"""
Verificar status do pagamento que falhou
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment
import json

ref = 'ade0ba68-27d4-4e4e-a405-00b7e1ee15a8'
print("=" * 80)
print(f"🔍 VERIFICANDO PAGAMENTO: {ref}")
print("=" * 80)
print()

p = Payment.objects.filter(paysuite_reference=ref).first()

if p:
    print(f"✅ Payment encontrado!")
    print(f"   ID: {p.id}")
    print(f"   Status: {p.status}")
    print(f"   Created: {p.created_at}")
    print(f"   Updated: {p.updated_at}")
    print(f"   Amount: {p.amount} MZN")
    print()
    print(f"📄 Raw Response:")
    print(json.dumps(p.raw_response, indent=2) if p.raw_response else "None")
    print()
    
    if p.order:
        print(f"📦 Order vinculado:")
        print(f"   Order ID: {p.order.id}")
        print(f"   Order Number: {p.order.order_number}")
        print(f"   Order Status: {p.order.status}")
else:
    print("❌ Payment NÃO encontrado no banco de dados!")
    print()
    print("Isso significa que:")
    print("  1. O pagamento foi criado apenas via script (não pela loja)")
    print("  2. Ou o webhook não foi processado")
    
print()
print("=" * 80)
print("🔍 VERIFICANDO ÚLTIMOS PAGAMENTOS")
print("=" * 80)
print()

recent = Payment.objects.all().order_by('-created_at')[:5]
for p in recent:
    print(f"ID: {p.id} | Ref: {p.paysuite_reference} | Status: {p.status} | Updated: {p.updated_at}")

print()
