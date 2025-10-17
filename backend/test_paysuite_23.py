#!/usr/bin/env python
"""Script para testar consulta ao PaySuite para Payment #23"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment
from cart.payments.paysuite import PaysuiteClient
import json

try:
    payment = Payment.objects.get(id=23)
    print(f"\n📍 Payment #{payment.id}")
    print(f"   Status no DB: {payment.status}")
    print(f"   PaySuite Ref: {payment.paysuite_reference}")
    
    # Query PaySuite
    print(f"\n🔍 Consultando PaySuite API...")
    client = PaysuiteClient()
    response = client.get_payment_status(payment.paysuite_reference)
    
    print(f"\n📡 Resposta do PaySuite:")
    print(json.dumps(response, indent=2))
    
    # Analyze response
    print(f"\n📊 Análise:")
    status = response.get('status')
    print(f"   Response status: {status}")
    
    if status == 'success':
        data = response.get('data', {})
        print(f"   Transaction: {data.get('transaction')}")
        print(f"   Error: {data.get('error')}")
        print(f"   Message: {data.get('message')}")
        print(f"   Status field: {data.get('status')}")
    elif status == 'error':
        print(f"   Error message: {response.get('message')}")
        print(f"   Error code: {response.get('code')}")
        
except Payment.DoesNotExist:
    print("❌ Payment #23 não encontrado")
except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()
