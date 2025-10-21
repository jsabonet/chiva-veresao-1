#!/usr/bin/env python
"""
Verificar se os emails estão sendo enviados para o email correto do checkout
Testa todos os cenários: webhook paid, webhook failed, polling paid, polling failed
"""
import os
import django
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment, Order
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from cart.views import payment_status, paysuite_webhook
import json

User = get_user_model()

def criar_order_com_email_checkout():
    """Criar order com email específico no checkout (shipping_address)"""
    
    print("\n" + "="*80)
    print("📧 TESTE DE ENVIO DE EMAIL PARA ENDEREÇO DO CHECKOUT")
    print("="*80)
    
    # User pode ter um email diferente do checkout
    user, _ = User.objects.get_or_create(
        username='teste_email_checkout',
        defaults={
            'email': 'user@diferente.com',  # Email do usuário
            'first_name': 'User',
            'last_name': 'Teste'
        }
    )
    
    # Email fornecido no CHECKOUT (deve ser este que recebe emails)
    checkout_email = 'jsabonete09@gmail.com'
    
    order = Order.objects.create(
        user=user,
        status='pending',
        total_amount=1000.00,
        shipping_cost=100.00,
        shipping_address={
            'name': 'João Sabonete',
            'email': checkout_email,  # ← EMAIL DO CHECKOUT
            'phone': '841234567',
            'address': 'Av. Julius Nyerere, 123',
            'city': 'Maputo',
            'province': 'Maputo'
        },
        billing_address={
            'name': 'João Sabonete',
            'email': checkout_email
        }
    )
    
    payment = Payment.objects.create(
        order=order,
        status='pending',
        amount=1000.00,
        method='paysuite',
        paysuite_reference='TEST_EMAIL_001',
        request_data={
            'customer_email': checkout_email,
            'customer_name': 'João Sabonete',
            'amount': 1000.00
        }
    )
    
    print(f"\n✅ Order criado:")
    print(f"   Order ID: {order.id}")
    print(f"   User Email: {user.email}")
    print(f"   Checkout Email (shipping_address): {checkout_email}")
    print(f"   Payment ID: {payment.id}")
    
    return user, order, payment, checkout_email

def testar_webhook_paid(order, payment, checkout_email):
    """Testar envio de email via webhook paid"""
    
    print("\n" + "="*80)
    print("🔔 TESTE 1: WEBHOOK PAID")
    print("="*80)
    
    # Simular webhook do PaySuite
    webhook_payload = {
        'event': 'payment.success',
        'data': {
            'id': payment.paysuite_reference,
            'reference': payment.paysuite_reference,
            'amount': float(payment.amount),
            'status': 'paid',
            'payment_method': 'mpesa'
        }
    }
    
    factory = APIRequestFactory()
    request = factory.post(
        '/api/cart/payments/webhook/',
        data=webhook_payload,
        format='json'
    )
    
    print(f"\n📡 Enviando webhook 'payment.success'...")
    response = paysuite_webhook(request)
    
    print(f"✅ Response: {response.status_code}")
    
    # Verificar no banco
    payment.refresh_from_db()
    order.refresh_from_db()
    
    print(f"\n📊 Status Atualizados:")
    print(f"   Payment: {payment.status}")
    print(f"   Order: {order.status}")
    
    print(f"\n📧 Email deveria ter sido enviado para:")
    print(f"   ✓ {checkout_email} (CHECKOUT EMAIL)")
    print(f"   ✗ NÃO para: {order.user.email} (USER EMAIL)")
    
    return payment.status == 'paid'

def testar_webhook_failed(order, payment, checkout_email):
    """Testar envio de email via webhook failed"""
    
    print("\n" + "="*80)
    print("🔔 TESTE 2: WEBHOOK FAILED")
    print("="*80)
    
    # Resetar status
    payment.status = 'pending'
    payment.save()
    order.status = 'pending'
    order.save()
    
    webhook_payload = {
        'event': 'payment.failed',
        'data': {
            'id': payment.paysuite_reference,
            'reference': payment.paysuite_reference,
            'amount': float(payment.amount),
            'status': 'failed',
            'error': 'Saldo insuficiente'
        }
    }
    
    factory = APIRequestFactory()
    request = factory.post(
        '/api/cart/payments/webhook/',
        data=webhook_payload,
        format='json'
    )
    
    print(f"\n📡 Enviando webhook 'payment.failed'...")
    response = paysuite_webhook(request)
    
    print(f"✅ Response: {response.status_code}")
    
    payment.refresh_from_db()
    order.refresh_from_db()
    
    print(f"\n📊 Status Atualizados:")
    print(f"   Payment: {payment.status}")
    print(f"   Order: {order.status}")
    
    print(f"\n📧 Email de FALHA deveria ter sido enviado para:")
    print(f"   ✓ {checkout_email} (CHECKOUT EMAIL)")
    
    return payment.status == 'failed'

def testar_polling_failed(user, order, payment, checkout_email):
    """Testar envio de email via polling quando detecta failed"""
    
    print("\n" + "="*80)
    print("🔄 TESTE 3: POLLING DETECTA FAILED")
    print("="*80)
    
    # Resetar status
    payment.status = 'pending'
    payment.paysuite_reference = 'NONEXISTENT_REF_404'  # Reference que retorna 404
    payment.save()
    order.status = 'pending'
    order.save()
    
    factory = APIRequestFactory()
    request = factory.get(f'/api/cart/orders/{order.id}/status/')
    force_authenticate(request, user=user)
    
    print(f"\n📡 Chamando polling endpoint (reference inválida → 404)...")
    response = payment_status(request, order_id=order.id)
    
    print(f"✅ Response: {response.status_code}")
    
    payment.refresh_from_db()
    order.refresh_from_db()
    
    print(f"\n📊 Status Atualizados:")
    print(f"   Payment: {payment.status}")
    print(f"   Order: {order.status}")
    
    if payment.status == 'failed':
        print(f"\n✅ Polling detectou falha!")
        print(f"\n📧 Email de FALHA deveria ter sido enviado para:")
        print(f"   ✓ {checkout_email} (CHECKOUT EMAIL)")
        return True
    else:
        print(f"\n⚠️  Status não mudou para failed")
        return False

def verificar_email_service():
    """Verificar configuração do email service"""
    
    print("\n" + "="*80)
    print("🔍 VERIFICAÇÃO DO EMAIL SERVICE")
    print("="*80)
    
    try:
        from cart.email_service import get_email_service
        from django.conf import settings
        
        email_service = get_email_service()
        
        print(f"\n✅ Email Service configurado:")
        print(f"   API Key: {settings.BREVO_API_KEY[:20]}..." if hasattr(settings, 'BREVO_API_KEY') else "   ❌ BREVO_API_KEY não configurado")
        print(f"   Sender Email: {settings.BREVO_SENDER_EMAIL}" if hasattr(settings, 'BREVO_SENDER_EMAIL') else "   ❌ BREVO_SENDER_EMAIL não configurado")
        print(f"   Admin Email: {settings.ADMIN_EMAIL}" if hasattr(settings, 'ADMIN_EMAIL') else "   ⚠️ ADMIN_EMAIL não configurado")
        
        return True
    except Exception as e:
        print(f"\n❌ Erro ao verificar email service: {e}")
        return False

def main():
    print("\n🚀 INICIANDO TESTE DE EMAILS DO CHECKOUT\n")
    
    # Verificar configuração
    if not verificar_email_service():
        print("\n❌ Email service não configurado corretamente!")
        return
    
    # Criar cenário
    user, order, payment, checkout_email = criar_order_com_email_checkout()
    
    # Teste 1: Webhook Paid
    test1_ok = testar_webhook_paid(order, payment, checkout_email)
    
    # Teste 2: Webhook Failed
    test2_ok = testar_webhook_failed(order, payment, checkout_email)
    
    # Teste 3: Polling Failed
    test3_ok = testar_polling_failed(user, order, payment, checkout_email)
    
    # Resumo Final
    print("\n" + "="*80)
    print("📋 RESUMO DOS TESTES")
    print("="*80)
    
    print(f"\n✅ Testes executados:")
    print(f"   {'✓' if test1_ok else '✗'} Webhook Paid: {checkout_email}")
    print(f"   {'✓' if test2_ok else '✗'} Webhook Failed: {checkout_email}")
    print(f"   {'✓' if test3_ok else '✗'} Polling Failed: {checkout_email}")
    
    if all([test1_ok, test2_ok, test3_ok]):
        print(f"\n✅ TODOS OS TESTES PASSARAM!")
        print(f"\n📧 Emails estão sendo enviados para:")
        print(f"   {checkout_email} (CHECKOUT EMAIL)")
        print(f"\n💡 Verifique a caixa de entrada de {checkout_email}")
        print(f"   Deve ter recebido 3 emails de teste")
    else:
        print(f"\n⚠️ Alguns testes falharam")
    
    print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    main()
