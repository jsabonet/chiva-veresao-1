#!/usr/bin/env python
"""
Teste de pagamento REAL com M-Pesa - CORREÇÃO FINAL
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.conf import settings
from cart.payments.paysuite import PaysuiteClient
import json

print("=" * 80)
print("🚀 TESTE DE PAGAMENTO M-PESA - CORREÇÃO FINAL")
print("=" * 80)
print()

# Cliente com credenciais explícitas (forma corrigida)
client = PaysuiteClient(
    base_url=settings.PAYSUITE_BASE_URL,
    api_key=settings.PAYSUITE_API_KEY,
    webhook_secret=settings.PAYSUITE_WEBHOOK_SECRET
)

print(f"✅ Cliente criado com Authorization header")
print(f"🔑 API Key: {client.api_key[:20]}..." if client.api_key else "❌ None")
print(f"🌐 Base URL: {client.base_url}")
print()

# Payload com reference SEM caracteres especiais (apenas alfanuméricos)
payload = {
    "amount": 50.00,
    "method": "mpesa",
    "reference": "MPESA001",  # Apenas letras e números
    "description": "Teste Mpesa 50 MZN",
    "msisdn": "258844720861",
    "callback_url": "https://chivacomputer.co.mz/api/cart/payments/webhook/",
    "return_url": "https://chivacomputer.co.mz/orders/status",
    "metadata": {
        "test": True,
        "phone": "258844720861"
    }
}

print("📦 PAYLOAD:")
print(json.dumps(payload, indent=2))
print()

print("-" * 80)
print("📤 ENVIANDO REQUISIÇÃO...")
print("-" * 80)
print()

try:
    response = client.create_payment(**payload)
    
    print("=" * 80)
    print("✅ SUCESSO! API PAYSUITE RESPONDEU COM JSON")
    print("=" * 80)
    print()
    print("📥 RESPONSE:")
    print(json.dumps(response, indent=2))
    print()
    
    # Analisar resposta
    if response.get('status') == 'success':
        data = response.get('data', {})
        print("🎉 PAGAMENTO CRIADO COM SUCESSO!")
        print()
        print(f"   ID: {data.get('id')}")
        print(f"   Reference: {data.get('reference')}")
        print(f"   Amount: {data.get('amount')} MZN")
        print(f"   Status: {data.get('status')}")
        
        if data.get('checkout_url'):
            print(f"   Checkout URL: {data.get('checkout_url')}")
            print()
            print("   👉 Acesse o link acima para completar o pagamento")
        
        print()
        print("🔔 IMPORTANTE:")
        print("   - Callback URL configurado: ✅")
        print("   - Webhook será enviado para: https://chivacomputer.co.mz/api/cart/payments/webhook/")
        print("   - Complete o pagamento pelo M-Pesa para testar o webhook")
        
    else:
        print("⚠️ RESPOSTA COM STATUS DE ERRO")
        print(f"   Message: {response.get('message')}")
    
except Exception as e:
    print("=" * 80)
    print("❌ ERRO NA REQUISIÇÃO")
    print("=" * 80)
    print()
    print(f"Erro: {e}")
    print()
    import traceback
    traceback.print_exc()

print()
print("=" * 80)
