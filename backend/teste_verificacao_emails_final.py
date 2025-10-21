#!/usr/bin/env python
"""
Teste Final - Verificação de Envio de Emails
===========================================
Testa se os emails são enviados AUTOMATICAMENTE após um pagamento.

Este teste:
1. Simula webhook do PaySuite
2. Captura TODOS os logs
3. Verifica se send_order_confirmation() foi chamado
4. Verifica se send_payment_status_update() foi chamado
5. Mostra PROVA de que emails foram enviados
"""

import os
import sys
import django
import logging
from io import StringIO

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from decimal import Decimal
from cart.models import Cart, CartItem, Order, Payment
from products.models import Product
from django.contrib.auth.models import User
from django.utils import timezone
import json

# Capturar logs em memória
log_stream = StringIO()
handler = logging.StreamHandler(log_stream)
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(message)s')
handler.setFormatter(formatter)

# Adicionar handler ao logger do cart
cart_logger = logging.getLogger('cart.views')
cart_logger.addHandler(handler)
cart_logger.setLevel(logging.INFO)

print("\n" + "=" * 80)
print("🧪 TESTE FINAL - VERIFICAÇÃO DE EMAILS AUTOMÁTICOS")
print("=" * 80)

# 1. PREPARAR DADOS
print("\n📋 Preparando dados de teste...")

test_email = "jsabonete09@gmail.com"  # EMAIL REAL PARA TESTE
test_username = "teste_email_final"

test_user, _ = User.objects.get_or_create(
    username=test_username,
    defaults={'email': test_email, 'first_name': 'Cliente', 'last_name': 'Teste'}
)

cart, _ = Cart.objects.get_or_create(
    user=test_user, status='active',
    defaults={'session_key': f'test_session_{timezone.now().timestamp()}'}
)

product = Product.objects.filter(stock_quantity__gt=0).first()
if not product:
    print("❌ Nenhum produto disponível")
    sys.exit(1)

cart_item, _ = CartItem.objects.get_or_create(
    cart=cart, product=product,
    defaults={'quantity': 1, 'price': product.price}
)

shipping_address = {
    'name': 'Cliente Teste Email',
    'email': test_email,  # ⚠️ EMAIL PARA ONDE SERÁ ENVIADO
    'phone': '+258 84 123 4567',
    'address': 'Rua Teste Email',
    'city': 'Maputo',
    'country': 'Moçambique'
}

order = Order.objects.create(
    cart=cart,
    user=test_user,
    total_amount=product.price,
    shipping_cost=Decimal('0'),
    status='pending',
    shipping_address=shipping_address,
    billing_address=shipping_address
)

payment = Payment.objects.create(
    cart=cart,
    order=order,
    amount=order.total_amount,
    method='mpesa',
    status='pending',
    paysuite_reference=f'TEST_EMAIL_{timezone.now().timestamp()}'
)

print(f"✅ Pedido #{order.order_number} criado")
print(f"✅ Email do cliente: {test_email}")
print(f"✅ Pagamento: {payment.paysuite_reference}")

# 2. SIMULAR WEBHOOK
print("\n📤 Simulando webhook do PaySuite...")

from django.test import RequestFactory
from cart.views import paysuite_webhook

webhook_payload = {
    'event': 'payment.success',
    'data': {
        'id': payment.paysuite_reference,
        'reference': payment.paysuite_reference,
        'amount': float(payment.amount),
        'status': 'paid'
    },
    'metadata': {'order_id': order.id}
}

factory = RequestFactory()
request = factory.post(
    '/api/cart/payments/webhook/',
    data=json.dumps(webhook_payload),
    content_type='application/json'
)

print(f"   Event: payment.success")
print(f"   Order ID: {order.id}")

# 3. PROCESSAR WEBHOOK E CAPTURAR LOGS
print("\n⚡ Processando webhook e capturando logs...\n")

try:
    response = paysuite_webhook(request)
    print(f"✅ Webhook processado: Status {response.status_code}\n")
except Exception as e:
    print(f"❌ Erro: {e}\n")
    import traceback
    traceback.print_exc()

# 4. ANALISAR LOGS CAPTURADOS
print("=" * 80)
print("📊 ANÁLISE DOS LOGS CAPTURADOS")
print("=" * 80)

logs = log_stream.getvalue()

if not logs:
    print("\n⚠️  NENHUM LOG CAPTURADO!")
    print("   Isso significa que o logger não está funcionando como esperado.")
else:
    print("\n📝 Logs capturados:\n")
    for line in logs.split('\n'):
        if line.strip():
            print(f"   {line}")

# 5. VERIFICAR ENVIO DE EMAILS
print("\n" + "=" * 80)
print("🔍 VERIFICAÇÃO DE ENVIO DE EMAILS")
print("=" * 80)

email_confirmacao_enviado = '📧 Emails de confirmação enviados' in logs
email_admin_enviado = '📧 Email de nova venda enviado' in logs

print(f"\n{'✅' if email_confirmacao_enviado else '❌'} Email de confirmação para cliente: {'ENVIADO' if email_confirmacao_enviado else 'NÃO ENVIADO'}")
print(f"{'✅' if email_admin_enviado else '❌'} Email de nova venda para admin: {'ENVIADO' if email_admin_enviado else 'NÃO ENVIADO'}")

# 6. VERIFICAR STATUS FINAL
payment.refresh_from_db()
order.refresh_from_db()

print("\n" + "=" * 80)
print("📊 STATUS FINAL")
print("=" * 80)
print(f"\nPayment Status: {payment.status}")
print(f"Order Status: {order.status}")
print(f"OrderItems: {order.items.count()}")

# 7. CONCLUSÃO
print("\n" + "=" * 80)
print("🎯 CONCLUSÃO")
print("=" * 80)

if email_confirmacao_enviado and email_admin_enviado:
    print("""
✅ SUCESSO! Emails SÃO enviados automaticamente!

Os logs confirmam que:
1. ✅ Email de confirmação foi enviado para o cliente
2. ✅ Email de nova venda foi enviado para o admin
3. ✅ O código de envio está funcionando corretamente

Próximo passo:
- Verificar caixa de entrada de {email}
- Verificar pasta SPAM
- Verificar dashboard do Brevo

O sistema ESTÁ funcionando! Se não recebe emails, o problema é:
1. Email indo para SPAM
2. Provedor bloqueando
3. Delay na entrega
""".format(email=test_email))
else:
    print(f"""
❌ ATENÇÃO! Emails NÃO foram enviados!

Possíveis causas:
1. Código de envio não foi executado (verificar views.py)
2. Exception durante envio (verificar logs de erro)
3. Email service não está configurado

AÇÃO NECESSÁRIA:
- Verificar se há exceções nos logs
- Verificar se email_service está importado corretamente
- Verificar se BREVO_API_KEY está configurada
""")

print("\n" + "=" * 80)
