#!/usr/bin/env python
"""
Teste direto da API PaySuite com diferentes formatos
Baseado na documentação oficial do PaySuite
"""
import os
import sys
import django
import requests
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.conf import settings

# Configurações
API_KEY = os.getenv('PAYSUITE_API_KEY')
BASE_URL = os.getenv('PAYSUITE_BASE_URL', 'https://paysuite-proxy.jsabonete09.workers.dev')
WEBHOOK_URL = "https://chivacomputer.co.mz/api/cart/payments/webhook/"

print("=" * 80)
print("🧪 TESTE DIRETO API PAYSUITE - DIFERENTES FORMATOS")
print("=" * 80)
print()
print(f"📍 Base URL: {BASE_URL}")
print(f"🔑 API Key: {API_KEY[:20]}..." if API_KEY else "❌ API Key não encontrada")
print(f"🔔 Webhook: {WEBHOOK_URL}")
print()

# Teste 1: Formato JSON puro (application/json)
print("-" * 80)
print("TESTE 1: POST com Content-Type: application/json")
print("-" * 80)

payload1 = {
    "amount": 100.00,
    "method": "mpesa",
    "reference": "TEST_JSON_001",
    "description": "Teste de pagamento M-Pesa",
    "msisdn": "258844720861",
    "callback_url": WEBHOOK_URL,
    "return_url": "https://chivacomputer.co.mz/orders/status"
}

headers1 = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

try:
    print(f"📨 Enviando para: {BASE_URL}/v1/payments")
    print(f"📦 Payload: {json.dumps(payload1, indent=2)}")
    print(f"🔐 Headers: {json.dumps({k: v[:30]+'...' if k == 'Authorization' and len(v) > 30 else v for k, v in headers1.items()}, indent=2)}")
    
    resp1 = requests.post(
        f"{BASE_URL}/v1/payments",
        json=payload1,  # Usa json= ao invés de data=
        headers=headers1,
        timeout=30
    )
    
    print(f"\n📊 Status: {resp1.status_code}")
    print(f"📋 Response Headers: {dict(resp1.headers)}")
    print(f"📄 Response Body:")
    print(resp1.text[:1000])
    
    if resp1.status_code == 200:
        try:
            data = resp1.json()
            print("\n✅ JSON Response:")
            print(json.dumps(data, indent=2))
        except:
            print("\n⚠️ Não é JSON válido")
    
except Exception as e:
    print(f"\n❌ Erro: {e}")

print()
print()

# Teste 2: Formato form-urlencoded
print("-" * 80)
print("TESTE 2: POST com Content-Type: application/x-www-form-urlencoded")
print("-" * 80)

payload2 = {
    "amount": 100.00,
    "method": "mpesa",
    "reference": "TEST_FORM_002",
    "description": "Teste de pagamento M-Pesa",
    "msisdn": "258844720861",
    "callback_url": WEBHOOK_URL,
    "return_url": "https://chivacomputer.co.mz/orders/status"
}

headers2 = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json"
}

try:
    print(f"📨 Enviando para: {BASE_URL}/v1/payments")
    print(f"📦 Payload: {payload2}")
    
    resp2 = requests.post(
        f"{BASE_URL}/v1/payments",
        data=payload2,  # form data
        headers=headers2,
        timeout=30
    )
    
    print(f"\n📊 Status: {resp2.status_code}")
    print(f"📄 Response Body:")
    print(resp2.text[:1000])
    
    if resp2.status_code == 200:
        try:
            data = resp2.json()
            print("\n✅ JSON Response:")
            print(json.dumps(data, indent=2))
        except:
            print("\n⚠️ Não é JSON válido")
    
except Exception as e:
    print(f"\n❌ Erro: {e}")

print()
print()

# Teste 3: Sem método especificado (deixar PaySuite escolher)
print("-" * 80)
print("TESTE 3: POST sem 'method' (auto-detect)")
print("-" * 80)

payload3 = {
    "amount": 100.00,
    "reference": "TEST_AUTO_003",
    "description": "Teste auto-detect",
    "msisdn": "258844720861",
    "callback_url": WEBHOOK_URL,
    "return_url": "https://chivacomputer.co.mz/orders/status"
}

headers3 = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

try:
    print(f"📨 Enviando para: {BASE_URL}/v1/payments")
    print(f"📦 Payload: {json.dumps(payload3, indent=2)}")
    
    resp3 = requests.post(
        f"{BASE_URL}/v1/payments",
        json=payload3,
        headers=headers3,
        timeout=30
    )
    
    print(f"\n📊 Status: {resp3.status_code}")
    print(f"📄 Response Body:")
    print(resp3.text[:1000])
    
    if resp3.status_code == 200:
        try:
            data = resp3.json()
            print("\n✅ JSON Response:")
            print(json.dumps(data, indent=2))
        except:
            print("\n⚠️ Não é JSON válido")
    
except Exception as e:
    print(f"\n❌ Erro: {e}")

print()
print()

# Teste 4: Tentar endpoint de consulta de status (GET)
print("-" * 80)
print("TESTE 4: GET /v1/payments (listar pagamentos)")
print("-" * 80)

headers4 = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

try:
    print(f"📨 GET: {BASE_URL}/v1/payments")
    
    resp4 = requests.get(
        f"{BASE_URL}/v1/payments",
        headers=headers4,
        timeout=30
    )
    
    print(f"\n📊 Status: {resp4.status_code}")
    print(f"📄 Response Body:")
    print(resp4.text[:1000])
    
    if resp4.status_code == 200:
        try:
            data = resp4.json()
            print("\n✅ JSON Response:")
            print(json.dumps(data, indent=2)[:500])
        except:
            print("\n⚠️ Não é JSON válido")
    
except Exception as e:
    print(f"\n❌ Erro: {e}")

print()
print("=" * 80)
print("✅ TESTES CONCLUÍDOS")
print("=" * 80)
