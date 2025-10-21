#!/usr/bin/env python
"""
Teste completo do sistema de polling integrado com emails
Simula um pagamento pendente e verifica se o polling detecta e envia emails
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
from cart.views import payment_status
import json

User = get_user_model()

def criar_cenario_teste():
    """Criar um pagamento pendente com order para testar polling"""
    
    print("\n" + "="*80)
    print("🧪 TESTE DE POLLING COM EMAILS")
    print("="*80)
    
    # Buscar ou criar user
    user, _ = User.objects.get_or_create(
        username='teste_polling_emails',
        defaults={
            'email': 'jsabonete09@gmail.com',
            'first_name': 'Teste',
            'last_name': 'Polling'
        }
    )
    
    # Criar order
    order = Order.objects.create(
        user=user,
        status='pending',
        total_amount=500.00,
        shipping_cost=50.00,
        shipping_address={
            'name': 'Cliente Teste Polling',
            'email': 'jsabonete09@gmail.com',
            'phone': '841234567',
            'address': 'Rua Teste Polling',
            'city': 'Maputo',
            'province': 'Maputo'
        },
        billing_address={
            'name': 'Cliente Teste Polling',
            'email': 'jsabonete09@gmail.com'
        }
    )
    
    # Criar payment com reference do PaySuite (simulando uma reference real)
    # Usar uma reference que sabemos que existe no PaySuite
    payment = Payment.objects.create(
        order=order,
        status='pending',
        amount=500.00,
        method='paysuite',
        paysuite_reference='TEST_POLLING_001',  # Trocar por uma reference real se necessário
        request_data={
            'customer_email': 'cliente.polling@test.com',
            'customer_name': 'Cliente Teste Polling',
            'amount': 500.00
        }
    )
    
    print(f"\n✅ Cenário criado:")
    print(f"   User: {user.username}")
    print(f"   Order ID: {order.id}")
    print(f"   Payment ID: {payment.id}")
    print(f"   Payment Status: {payment.status}")
    print(f"   PaySuite Reference: {payment.paysuite_reference}")
    print(f"   Customer Email: cliente.polling@test.com")
    
    return user, order, payment

def testar_polling(user, order):
    """Simular chamada do endpoint de polling"""
    
    print("\n" + "="*80)
    print("🔄 TESTANDO POLLING ENDPOINT")
    print("="*80)
    
    factory = APIRequestFactory()
    request = factory.get(f'/api/cart/orders/{order.id}/status/')
    force_authenticate(request, user=user)
    
    print(f"\n📡 Chamando payment_status endpoint para order #{order.id}...")
    response = payment_status(request, order_id=order.id)
    
    print(f"\n✅ Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.data
        print(f"\n📊 RESULTADO:")
        print(f"   Order Status: {data['order']['status']}")
        
        if data['payments']:
            payment_data = data['payments'][0]
            print(f"   Payment Status: {payment_data['status']}")
            print(f"   Payment ID: {payment_data['id']}")
            print(f"   PaySuite Reference: {payment_data.get('paysuite_reference', 'N/A')}")
            
            # Verificar se houve polling
            if 'polled_at' in payment_data.get('raw_response', {}):
                print(f"\n✅ POLLING EXECUTADO!")
                print(f"   Polled At: {payment_data['raw_response']['polled_at']}")
                
                if 'polled_response' in payment_data['raw_response']:
                    polled = payment_data['raw_response']['polled_response']
                    print(f"   PaySuite Status: {polled.get('status', 'N/A')}")
                    
                    if polled.get('data'):
                        print(f"   Transaction: {polled['data'].get('transaction', 'null')}")
                        print(f"   Error: {polled['data'].get('error', 'null')}")
            else:
                print(f"\n⚠️  Polling não foi executado (payment não estava pending ou sem reference)")
        else:
            print("   No payments found")
    else:
        print(f"❌ Error: {response.data}")
    
    return response

def verificar_mudancas(payment_id, order_id):
    """Verificar se status foi atualizado no banco"""
    
    print("\n" + "="*80)
    print("🔍 VERIFICANDO MUDANÇAS NO BANCO DE DADOS")
    print("="*80)
    
    payment = Payment.objects.get(id=payment_id)
    order = Order.objects.get(id=order_id)
    
    print(f"\n📊 Status Atuais:")
    print(f"   Payment #{payment.id}: {payment.status}")
    print(f"   Order #{order.id}: {order.status}")
    
    if payment.raw_response and 'polled_response' in payment.raw_response:
        print(f"\n✅ Polling Response salvo em raw_response:")
        print(json.dumps(payment.raw_response.get('polled_response', {}), indent=2)[:500])
    
    if payment.status == 'paid':
        print(f"\n✅ SUCESSO! Pagamento confirmado via polling")
        print(f"   ✓ Status atualizado para 'paid'")
        print(f"   ✓ Emails deveriam ter sido enviados")
        
    elif payment.status == 'failed':
        print(f"\n❌ Pagamento falhou")
        print(f"   ✓ Status atualizado para 'failed'")
        print(f"   ✓ Email de falha deveria ter sido enviado")
        
        if 'error_message' in payment.raw_response:
            print(f"   ✓ Erro: {payment.raw_response['error_message']}")
    
    elif payment.status == 'pending':
        print(f"\n⏳ Pagamento ainda pendente")
        print(f"   Possíveis razões:")
        print(f"   - PaySuite ainda processando")
        print(f"   - Reference inválida ou não existe")
        print(f"   - Timeout ainda não atingido")
    
    return payment, order

def main():
    print("\n🚀 INICIANDO TESTE DE POLLING COM EMAILS\n")
    
    # 1. Criar cenário
    user, order, payment = criar_cenario_teste()
    
    # 2. Executar polling
    response = testar_polling(user, order)
    
    # 3. Verificar mudanças
    payment_updated, order_updated = verificar_mudancas(payment.id, order.id)
    
    # 4. Resumo final
    print("\n" + "="*80)
    print("📋 RESUMO DO TESTE")
    print("="*80)
    
    print(f"\n✅ Teste executado com sucesso!")
    print(f"\n📊 Resultados:")
    print(f"   Payment ID: {payment_updated.id}")
    print(f"   Status Inicial: pending")
    print(f"   Status Final: {payment_updated.status}")
    print(f"   Order Status: {order_updated.status}")
    
    if payment_updated.status != 'pending':
        print(f"\n✅ POLLING FUNCIONOU!")
        print(f"   ✓ Status foi atualizado de 'pending' para '{payment_updated.status}'")
        print(f"   ✓ Verifique os logs acima para confirmar envio de emails")
    else:
        print(f"\n⚠️  Status permanece 'pending'")
        print(f"   Isso é esperado se:")
        print(f"   - Reference não existe no PaySuite")
        print(f"   - PaySuite ainda está processando")
        print(f"   - Timeout não foi atingido")
    
    print(f"\n💡 Para testar com pagamento real:")
    print(f"   1. Faça um pagamento real na loja")
    print(f"   2. Copie o paysuite_reference")
    print(f"   3. Execute este teste passando a reference real")
    
    print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    main()
