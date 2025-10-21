#!/usr/bin/env python
"""
Script para testar o tratamento de webhook de pagamento FAILED
Simula um webhook do PaySuite informando que o pagamento falhou
"""
import os
import django
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment, Order
from django.contrib.auth import get_user_model
import json

User = get_user_model()

def criar_pagamento_teste():
    """Criar um pagamento pending com order associado para testar"""
    
    # Buscar ou criar user de teste
    user, _ = User.objects.get_or_create(
        username='teste_webhook_failed',
        defaults={
            'email': 'teste@webhook.failed',
            'first_name': 'Teste',
            'last_name': 'Webhook Failed'
        }
    )
    
    # Criar order de teste
    order = Order.objects.create(
        user=user,
        status='pending',
        total_amount=1000.00,
        shipping_cost=100.00,
        shipping_address={
            'name': 'Cliente Teste Failed',
            'email': 'cliente.failed@test.com',
            'phone': '841234567',
            'address': 'Rua Teste, 123',
            'city': 'Maputo',
            'province': 'Maputo',
            'postal_code': '1100'
        },
        billing_address={
            'name': 'Cliente Teste Failed',
            'email': 'cliente.failed@test.com'
        }
    )
    
    # Criar payment associado
    payment = Payment.objects.create(
        order=order,
        status='pending',
        amount=1000.00,
        method='paysuite',
        paysuite_reference='TEST_FAILED_' + str(order.id),
        request_data={
            'customer_email': 'cliente.failed@test.com',
            'customer_name': 'Cliente Teste Failed',
            'amount': 1000.00,
            'callback_url': 'https://chivacomputer.co.mz/api/cart/payments/webhook/'
        }
    )
    
    print(f"✅ Criado Payment ID: {payment.id}")
    print(f"✅ Criado Order ID: {order.id}")
    print(f"✅ Reference: {payment.paysuite_reference}")
    print(f"✅ Customer Email: cliente.failed@test.com")
    
    return payment

def simular_webhook_failed(payment):
    """Simular webhook do PaySuite informando que pagamento falhou"""
    
    # Payload típico do PaySuite para payment.failed
    webhook_payload = {
        'event': 'payment.failed',
        'data': {
            'id': payment.paysuite_reference,
            'reference': payment.paysuite_reference,
            'amount': float(payment.amount),
            'currency': 'MZN',
            'status': 'failed',
            'payment_method': 'mpesa',
            'description': 'Pagamento falhou - Saldo insuficiente',
            'created_at': '2025-01-21T10:00:00Z',
            'updated_at': '2025-01-21T10:05:00Z',
            'metadata': {
                'order_id': payment.order.id if payment.order else None
            }
        }
    }
    
    print("\n" + "="*80)
    print("🔔 SIMULANDO WEBHOOK DE PAGAMENTO FALHADO")
    print("="*80)
    print(json.dumps(webhook_payload, indent=2))
    print("="*80)
    
    # Processar webhook manualmente
    from cart.views import paysuite_webhook
    from rest_framework.test import APIRequestFactory
    from django.contrib.auth.models import AnonymousUser
    
    factory = APIRequestFactory()
    
    # Criar request POST com o payload
    request = factory.post(
        '/api/cart/payments/webhook/',
        data=webhook_payload,
        format='json'
    )
    request.user = AnonymousUser()
    
    # Chamar o webhook handler
    print("\n📡 Processando webhook...")
    response = paysuite_webhook(request)
    
    print(f"\n✅ Response Status: {response.status_code}")
    print(f"✅ Response Data: {response.data}")
    
    # Verificar mudanças no banco de dados
    payment.refresh_from_db()
    print(f"\n📊 RESULTADOS:")
    print(f"   Payment Status: {payment.status}")
    
    if payment.order:
        payment.order.refresh_from_db()
        print(f"   Order Status: {payment.order.status}")
    
    print(f"\n💡 Email de falha deveria ter sido enviado para: cliente.failed@test.com")
    print(f"   Verifique logs acima para confirmar envio")
    
    return payment

if __name__ == '__main__':
    print("\n🧪 TESTE DE WEBHOOK DE PAGAMENTO FALHADO\n")
    
    # Criar pagamento teste
    payment = criar_pagamento_teste()
    
    # Simular webhook
    payment_updated = simular_webhook_failed(payment)
    
    print("\n" + "="*80)
    print("✅ TESTE COMPLETO!")
    print("="*80)
    print(f"\nVerifique:")
    print(f"1. Payment #{payment_updated.id} deve ter status='failed'")
    print(f"2. Order #{payment_updated.order.id} deve ter status='failed'")
    print(f"3. Email de falha enviado para cliente.failed@test.com")
    print(f"\n💡 Para verificar no Django Admin:")
    print(f"   Payment: /admin/cart/payment/{payment_updated.id}/")
    print(f"   Order: /admin/cart/order/{payment_updated.order.id}/")
    print()
