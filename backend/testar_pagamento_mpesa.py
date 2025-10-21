#!/usr/bin/env python
"""
Script para testar requisição de pagamento M-Pesa real via PaySuite API
Testa com número: 844720861
"""

import os
import sys
import django
import json
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.conf import settings
from cart.models import Payment, Cart, Order
from cart.payments.paysuite import PaysuiteClient
from products.models import Product

print('='*80)
print('🧪 TESTE DE PAGAMENTO M-PESA VIA PAYSUITE API')
print('='*80)
print()

# Informações do teste
phone_number = '844720861'
formatted_phone = f'+258{phone_number}'
amount = 100.00  # Valor de teste: 100 MZN

print(f'📱 Número: {formatted_phone}')
print(f'💰 Valor: {amount} MZN')
print(f'💳 Método: M-Pesa')
print()

# Verificar configurações
print('🔧 CONFIGURAÇÕES:')
print(f'   PAYSUITE_BASE_URL: {settings.PAYSUITE_BASE_URL}')
print(f'   PAYSUITE_API_KEY: {settings.PAYSUITE_API_KEY[:20]}...')
print(f'   WEBHOOK_BASE_URL: {settings.WEBHOOK_BASE_URL}')
print()

# Criar ou usar carrinho existente
try:
    # Tentar pegar um produto para criar um carrinho realista
    product = Product.objects.first()
    if not product:
        print('⚠️  Nenhum produto encontrado, criando payment sem carrinho')
        cart = None
    else:
        print(f'📦 Produto: {product.name} - {product.price} MZN')
        
        # Criar carrinho simples
        cart = Cart.objects.create(
            user=None,
            status='active',
            total=Decimal(str(amount))
        )
        print(f'🛒 Carrinho criado: ID {cart.id}')
except Exception as e:
    print(f'⚠️  Erro ao criar carrinho: {e}')
    cart = None

# Criar Payment record
print()
print('💾 Criando Payment record...')

payment = Payment.objects.create(
    order=None,
    cart=cart,
    method='mpesa',
    amount=Decimal(str(amount)),
    currency='MZN',
    status='initiated',
    request_data={
        'phone': formatted_phone,
        'method': 'mpesa',
        'amount': amount,
        'test': True,
        'test_description': 'Teste manual via script para verificar webhook'
    }
)

print(f'✅ Payment criado: ID {payment.id}')
print()

# Preparar dados para PaySuite
callback_url = f"{settings.WEBHOOK_BASE_URL.rstrip('/')}/api/cart/payments/webhook/"
return_url = f"{settings.WEBHOOK_BASE_URL.rstrip('/')}/orders/status"
reference = f"TEST{payment.id:06d}"

print('🔗 URLs:')
print(f'   Callback URL: {callback_url}')
print(f'   Return URL: {return_url}')
print(f'   Reference: {reference}')
print()

# Criar cliente PaySuite
client = PaysuiteClient()

# Preparar payload
payment_data = {
    'amount': float(amount),
    'method': 'mpesa',
    'reference': reference,
    'description': f'Teste M-Pesa - Payment {payment.id}',
    'callback_url': callback_url,
    'return_url': return_url,
    'msisdn': formatted_phone,
    'metadata': {
        'payment_id': payment.id,
        'test': True,
        'phone': formatted_phone
    }
}

print('📤 PAYLOAD ENVIADO AO PAYSUITE:')
print(json.dumps(payment_data, indent=2))
print()
print('='*80)
print('🚀 ENVIANDO REQUISIÇÃO AO PAYSUITE...')
print('='*80)
print()

try:
    # Fazer chamada à API
    api_response = client.create_payment(**payment_data)
    
    print('='*80)
    print('📥 RESPOSTA DO PAYSUITE:')
    print('='*80)
    print(json.dumps(api_response, indent=2))
    print()
    
    # Analisar resposta
    status_str = api_response.get('status')
    data = api_response.get('data', {})
    
    if status_str == 'success':
        print('✅ REQUISIÇÃO BEM SUCEDIDA!')
        print()
        
        # Extrair informações
        external_id = data.get('id')
        external_ref = data.get('reference')
        checkout_url = data.get('checkout_url')
        payment_status = data.get('status')
        
        print('📊 INFORMAÇÕES DO PAGAMENTO:')
        print(f'   ID PaySuite: {external_id}')
        print(f'   Reference: {external_ref}')
        print(f'   Status: {payment_status}')
        print(f'   Checkout URL: {checkout_url}')
        print()
        
        # Atualizar payment
        payment.paysuite_reference = external_id or external_ref
        payment.raw_response = api_response
        payment.status = 'pending'
        payment.save()
        
        print(f'✅ Payment {payment.id} atualizado no banco')
        print()
        
        # Instruções
        print('='*80)
        print('📱 PRÓXIMOS PASSOS:')
        print('='*80)
        print()
        
        if checkout_url:
            print(f'1. Acesse o checkout URL: {checkout_url}')
            print(f'2. Complete o pagamento com M-Pesa usando o número: {formatted_phone}')
            print('3. Aguarde o webhook ser recebido')
            print()
        else:
            print('⚠️  Nenhum checkout_url retornado')
            print('   O pagamento pode ser direto (push notification)')
            print(f'   Verifique o celular {formatted_phone} para notificação M-Pesa')
            print()
        
        print('🔍 MONITORAR:')
        print()
        print('   a) Status do payment no banco:')
        print(f'      Payment ID: {payment.id}')
        print()
        print('   b) Logs do servidor (se em produção):')
        print('      tail -f /var/log/nginx/access.log | grep webhook')
        print()
        print('   c) Dashboard do PaySuite:')
        print('      https://dashboard.paysuite.co.mz/')
        print()
        
        # Verificar se callback_url está no response
        if 'callback_url' in data or 'callback' in data:
            print('✅ callback_url presente na resposta do PaySuite')
        else:
            print('⚠️  callback_url NÃO está na resposta do PaySuite')
            print('   Isso pode indicar que:')
            print('   - O PaySuite não retorna callback_url no response')
            print('   - O webhook será enviado baseado na configuração do dashboard')
            print('   - Ou o método usado não suporta callback automático')
        print()
        
    else:
        print('❌ REQUISIÇÃO FALHOU!')
        print()
        error_message = api_response.get('message', 'Erro desconhecido')
        error_code = api_response.get('error_code', 'N/A')
        
        print(f'   Mensagem: {error_message}')
        print(f'   Código: {error_code}')
        print()
        
        # Atualizar payment como failed
        payment.status = 'failed'
        payment.raw_response = api_response
        payment.save()
        
except Exception as e:
    print('='*80)
    print('❌ ERRO AO CHAMAR API DO PAYSUITE:')
    print('='*80)
    print(f'{type(e).__name__}: {e}')
    print()
    
    import traceback
    traceback.print_exc()
    
    # Atualizar payment
    payment.status = 'failed'
    payment.raw_response = {'error': str(e), 'type': type(e).__name__}
    payment.save()

print()
print('='*80)
print('✅ TESTE COMPLETO')
print('='*80)
print()
print(f'Payment ID: {payment.id}')
print(f'Status final: {payment.status}')
print()
