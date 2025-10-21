#!/usr/bin/env python
"""
Teste rápido: verificar se Authorization header está sendo enviado
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.conf import settings
from cart.payments.paysuite import PaysuiteClient

print("=" * 80)
print("🔍 TESTE: AUTHORIZATION HEADER")
print("=" * 80)
print()

# Teste 1: Cliente sem parâmetros (forma antiga)
print("TESTE 1: PaysuiteClient() - SEM PARÂMETROS")
print("-" * 80)
client1 = PaysuiteClient()
print(f"API Key: {client1.api_key[:20]}..." if client1.api_key else "❌ None")
print(f"Headers: {dict(client1.session.headers)}")
print()

# Teste 2: Cliente com parâmetros explícitos (forma corrigida)
print("TESTE 2: PaysuiteClient(api_key=...) - COM PARÂMETROS")
print("-" * 80)
client2 = PaysuiteClient(
    base_url=settings.PAYSUITE_BASE_URL,
    api_key=settings.PAYSUITE_API_KEY,
    webhook_secret=settings.PAYSUITE_WEBHOOK_SECRET
)
print(f"API Key: {client2.api_key[:20]}..." if client2.api_key else "❌ None")
print(f"Headers: {dict(client2.session.headers)}")
print()

# Teste 3: Fazer requisição real com cliente corrigido
print("TESTE 3: REQUISIÇÃO REAL COM CLIENTE CORRIGIDO")
print("-" * 80)

payload = {
    "amount": 50.00,
    "method": "mpesa",
    "reference": "HEADER_TEST_001",
    "description": "Teste de Authorization Header",
    "msisdn": "258844720861",
    "callback_url": "https://chivacomputer.co.mz/api/cart/payments/webhook/",
    "return_url": "https://chivacomputer.co.mz/orders/status"
}

try:
    print(f"📤 Enviando payload: {payload}")
    print(f"🔐 Authorization será: Bearer {client2.api_key[:20]}...")
    print()
    
    response = client2.create_payment(**payload)
    
    print("✅ SUCESSO!")
    print(f"📥 Response: {response}")
    
except Exception as e:
    print(f"❌ ERRO: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 80)
