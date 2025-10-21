#!/usr/bin/env python
"""
Teste completo do fluxo de polling com envio de emails
Simula exatamente o que OrderConfirmation.tsx faz
"""
import os
import django
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment, Order
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from cart.views import payment_status
import json

User = get_user_model()

def criar_pedido_teste():
    """Criar um pedido pendente como o frontend cria"""
    
    print("\n" + "="*80)
    print("🛒 CRIANDO PEDIDO DE TESTE (Simulando Frontend)")
    print("="*80)
    
    # User
    user, _ = User.objects.get_or_create(
        username='teste_polling_completo',
        defaults={
            'email': 'user@test.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    
    # Email fornecido no checkout
    checkout_email = 'jsabonete09@gmail.com'
    
    # Criar order
    order = Order.objects.create(
        user=user,
        status='pending',
        total_amount=100.00,
        shipping_cost=10.00,
        shipping_address={
            'name': 'João Teste Completo',
            'email': checkout_email,
            'phone': '841234567',
            'address': 'Av. Teste, 123',
            'city': 'Maputo',
            'province': 'Maputo'
        },
        billing_address={
            'name': 'João Teste Completo',
            'email': checkout_email
        }
    )
    
    # Criar payment com reference inválida (vai retornar 404 = failed)
    payment = Payment.objects.create(
        order=order,
        status='pending',
        amount=100.00,
        method='paysuite',
        paysuite_reference='TEST_INVALID_REF_404',  # Reference que não existe
        request_data={
            'customer_email': checkout_email,
            'customer_name': 'João Teste Completo',
            'amount': 100.00,
            'items': []  # Vazio para simplificar
        }
    )
    
    print(f"\n✅ Pedido criado:")
    print(f"   Order ID: {order.id}")
    print(f"   Payment ID: {payment.id}")
    print(f"   Status: {payment.status}")
    print(f"   Email Cliente: {checkout_email}")
    print(f"   Reference: {payment.paysuite_reference}")
    
    return user, order, payment, checkout_email

def simular_polling_frontend(user, order, checkout_email):
    """Simular exatamente o que OrderConfirmation.tsx faz"""
    
    print("\n" + "="*80)
    print("🔄 SIMULANDO POLLING DO FRONTEND (OrderConfirmation.tsx)")
    print("="*80)
    
    factory = APIRequestFactory()
    
    print(f"\n📡 Iniciando polling a cada 3 segundos...")
    print(f"   (Frontend real faria isso por até 2 minutos)")
    
    # Fazer 3 polls (simula 9 segundos de polling)
    for i in range(1, 4):
        print(f"\n--- POLL #{i} ---")
        
        request = factory.get(f'/api/cart/orders/{order.id}/status/')
        force_authenticate(request, user=user)
        
        response = payment_status(request, order_id=order.id)
        
        if response.status_code == 200:
            data = response.data
            payment_data = data['payments'][0] if data['payments'] else None
            
            print(f"✅ Response OK")
            print(f"   Order Status: {data['order']['status']}")
            
            if payment_data:
                print(f"   Payment Status: {payment_data['status']}")
                
                # Verificar se houve mudança
                if payment_data['status'] != 'pending':
                    print(f"\n🎯 STATUS MUDOU PARA: {payment_data['status']}")
                    
                    # Verificar se email foi enviado
                    if 'polled_at' in payment_data.get('raw_response', {}):
                        print(f"   ✓ Polling executado em: {payment_data['raw_response']['polled_at']}")
                    
                    print(f"\n📧 Email deveria ter sido enviado para: {checkout_email}")
                    return payment_data['status']
        else:
            print(f"❌ Error: {response.status_code}")
        
        # Aguardar 3 segundos (como frontend)
        if i < 3:
            print(f"   ⏳ Aguardando 3 segundos...")
            time.sleep(3)
    
    return None

def verificar_email_enviado(payment_id, order_id, checkout_email):
    """Verificar se email foi realmente enviado"""
    
    print("\n" + "="*80)
    print("🔍 VERIFICANDO SE EMAIL FOI ENVIADO")
    print("="*80)
    
    payment = Payment.objects.get(id=payment_id)
    order = Order.objects.get(id=order_id)
    
    print(f"\n📊 Status Final:")
    print(f"   Payment: {payment.status}")
    print(f"   Order: {order.status}")
    
    # Verificar raw_response
    if payment.raw_response:
        print(f"\n✅ Raw Response existe:")
        
        if 'polled_at' in payment.raw_response:
            print(f"   ✓ Polled At: {payment.raw_response['polled_at']}")
        
        if 'polled_response' in payment.raw_response:
            polled = payment.raw_response['polled_response']
            print(f"   ✓ Polled Status: {polled.get('status', 'N/A')}")
            
            if polled.get('message'):
                print(f"   ✓ Message: {polled['message']}")
        
        if 'error_message' in payment.raw_response:
            print(f"   ✓ Error Message: {payment.raw_response['error_message']}")
    
    # Verificar se order tem email correto
    email_in_order = order.shipping_address.get('email', '')
    print(f"\n📧 Configuração de Email:")
    print(f"   Email no Order: {email_in_order}")
    print(f"   Email Esperado: {checkout_email}")
    print(f"   Match: {'✅ SIM' if email_in_order == checkout_email else '❌ NÃO'}")
    
    return payment, order

def main():
    print("\n🚀 TESTE COMPLETO: POLLING + EMAILS (Como OrderConfirmation.tsx)\n")
    
    # 1. Criar pedido
    user, order, payment, checkout_email = criar_pedido_teste()
    
    # 2. Simular polling do frontend
    final_status = simular_polling_frontend(user, order, checkout_email)
    
    # 3. Verificar resultado
    payment_updated, order_updated = verificar_email_enviado(
        payment.id, order.id, checkout_email
    )
    
    # 4. Resumo
    print("\n" + "="*80)
    print("📋 RESUMO DO TESTE")
    print("="*80)
    
    print(f"\n✅ Teste Completo Executado!")
    
    if final_status:
        print(f"\n🎯 Status Detectado: {final_status}")
        
        if final_status == 'failed':
            print(f"\n📧 EMAIL DE FALHA deveria ter sido enviado para:")
            print(f"   {checkout_email}")
            print(f"\n💡 Verifique a caixa de entrada!")
            print(f"   Assunto: algo como 'Pagamento não processado'")
            
        elif final_status == 'paid':
            print(f"\n📧 EMAILS DE SUCESSO deveriam ter sido enviados para:")
            print(f"   Cliente: {checkout_email}")
            print(f"   Admin: (configurado em settings)")
            print(f"\n💡 Verifique as caixas de entrada!")
            print(f"   Assunto Cliente: 'Pedido confirmado'")
            print(f"   Assunto Admin: 'Nova venda'")
    else:
        print(f"\n⚠️ Status permanece 'pending'")
        print(f"   Isso pode significar:")
        print(f"   - PaySuite ainda processando")
        print(f"   - Timeout não atingido")
    
    print("\n" + "="*80)
    
    # Verificar logs
    print(f"\n💡 DICA: Verifique os logs acima")
    print(f"   Procure por: '📧 [POLLING] Email'")
    print(f"   Se não aparecer, email NÃO foi enviado")
    
    print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    main()
