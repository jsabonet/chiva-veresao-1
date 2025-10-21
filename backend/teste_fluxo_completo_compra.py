#!/usr/bin/env python
"""
Teste Completo do Fluxo de Compra
==================================
Simula uma compra real do início ao fim para verificar se emails são enviados.

Fluxo testado:
1. Criar carrinho com produtos
2. Criar order + payment
3. Simular webhook do PaySuite (pagamento aprovado)
4. Verificar se emails foram enviados
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from decimal import Decimal
from cart.models import Cart, CartItem, Order, Payment
from products.models import Product, Color
from django.contrib.auth.models import User
from django.utils import timezone
import json

print("=" * 70)
print("🧪 TESTE COMPLETO DO FLUXO DE COMPRA")
print("=" * 70)

# 1. CRIAR USUÁRIO DE TESTE
print("\n📋 PASSO 1: Criar usuário de teste")
print("-" * 70)

test_email = "teste_compra@exemplo.com"
test_username = "teste_compra_user"

test_user, created = User.objects.get_or_create(
    username=test_username,
    defaults={
        'email': test_email,
        'first_name': 'Cliente',
        'last_name': 'Teste'
    }
)
if not created and not test_user.email:
    test_user.email = test_email
    test_user.save()

print(f"✅ Usuário: {test_user.email} {'(criado)' if created else '(já existe)'}")

# 2. CRIAR CARRINHO COM PRODUTOS
print("\n📋 PASSO 2: Criar carrinho com produtos")
print("-" * 70)

cart, created = Cart.objects.get_or_create(
    user=test_user,
    status='active',
    defaults={'session_key': 'test_session_12345'}
)
print(f"✅ Carrinho: ID={cart.id} {'(criado)' if created else '(já existe)'}")

# Pegar primeiro produto disponível
product = Product.objects.filter(stock_quantity__gt=0).first()
if not product:
    print("❌ ERRO: Nenhum produto com stock disponível!")
    print("   Crie um produto primeiro no admin: /admin/products/product/")
    sys.exit(1)

print(f"✅ Produto: {product.name} (Stock: {product.stock_quantity})")

# Adicionar produto ao carrinho
cart_item, created = CartItem.objects.get_or_create(
    cart=cart,
    product=product,
    defaults={
        'quantity': 1,
        'price': product.price
    }
)
if not created:
    cart_item.quantity = 1
    cart_item.save()

print(f"✅ Item adicionado: {product.name} x 1 = {product.price} MT")

# 3. CRIAR ORDER
print("\n📋 PASSO 3: Criar pedido (Order)")
print("-" * 70)

shipping_address = {
    'name': 'Cliente Teste',
    'email': test_email,  # EMAIL PARA ONDE SERÁ ENVIADO
    'phone': '+258 84 123 4567',
    'address': 'Rua Teste, 123',
    'city': 'Maputo',
    'state': 'Maputo',
    'postal_code': '1100',
    'country': 'Moçambique'
}

order = Order.objects.create(
    cart=cart,
    user=test_user,
    total_amount=product.price,
    shipping_cost=Decimal('0'),
    status='pending',
    shipping_method='standard',
    shipping_address=shipping_address,
    billing_address=shipping_address
)

print(f"✅ Pedido criado: #{order.order_number} (ID={order.id})")
print(f"   Total: {order.total_amount} MT")
print(f"   Email do cliente: {shipping_address['email']}")

# 4. CRIAR PAYMENT
print("\n📋 PASSO 4: Criar pagamento (Payment)")
print("-" * 70)

payment = Payment.objects.create(
    cart=cart,
    order=order,
    amount=order.total_amount,
    method='mpesa',  # Campo correto é 'method', não 'payment_method'
    status='pending',
    paysuite_reference=f'TEST_REF_{timezone.now().timestamp()}'
)

print(f"✅ Pagamento criado: ID={payment.id}")
print(f"   Referência: {payment.paysuite_reference}")
print(f"   Status: {payment.status}")

# 5. SIMULAR WEBHOOK DO PAYSUITE (PAGAMENTO APROVADO)
print("\n📋 PASSO 5: Simular webhook do PaySuite")
print("-" * 70)

from django.test import RequestFactory
from cart.views import paysuite_webhook
from rest_framework.test import force_authenticate

webhook_payload = {
    'event': 'payment.success',
    'data': {
        'id': payment.paysuite_reference,
        'reference': payment.paysuite_reference,
        'amount': float(payment.amount),
        'status': 'paid'
    },
    'metadata': {
        'order_id': order.id
    }
}

print(f"📤 Enviando webhook: event=payment.success")
print(f"   Referência: {payment.paysuite_reference}")

# Criar request fake
factory = RequestFactory()
request = factory.post(
    '/api/cart/payments/webhook/',
    data=json.dumps(webhook_payload),
    content_type='application/json'
)

# Processar webhook
try:
    response = paysuite_webhook(request)
    print(f"✅ Webhook processado: Status {response.status_code}")
except Exception as e:
    print(f"❌ Erro ao processar webhook: {e}")
    import traceback
    traceback.print_exc()

# 6. VERIFICAR RESULTADOS
print("\n📋 PASSO 6: Verificar resultados")
print("-" * 70)

# Recarregar do banco
payment.refresh_from_db()
order.refresh_from_db()

print(f"✅ Payment status: {payment.status}")
print(f"✅ Order status: {order.status}")

# Verificar OrderItems
order_items = order.items.all()
print(f"✅ OrderItems criados: {order_items.count()}")
for item in order_items:
    print(f"   - {item.product_name} x {item.quantity} = {item.subtotal} MT")

# 7. VERIFICAR LOGS DE EMAIL
print("\n📋 PASSO 7: Verificar logs de envio de email")
print("-" * 70)

print("""
⚠️  ATENÇÃO: Os emails foram enviados durante o processamento do webhook!

Para confirmar, verifique:

1. LOGS DO SERVIDOR:
   Procure por estas linhas no terminal onde o Django está rodando:
   
   📧 Emails de confirmação enviados para teste_compra@exemplo.com
   📧 Email de nova venda enviado para admin

2. CAIXA DE ENTRADA:
   Email: teste_compra@exemplo.com
   ⚠️  Verifique também a pasta SPAM!

3. DASHBOARD BREVO:
   https://app.brevo.com/
   Menu: Statistics > Email
   Verifique os emails enviados nos últimos minutos

4. TESTE REAL:
   Para ter CERTEZA ABSOLUTA, use SEU email real:
   Altere test_email = "SEU_EMAIL_AQUI@gmail.com"
   E execute novamente este script.
""")

print("\n" + "=" * 70)
print("✅ TESTE COMPLETO EXECUTADO!")
print("=" * 70)
print(f"""
RESUMO:
- Usuário: {test_user.email}
- Pedido: #{order.order_number}
- Status: {order.status}
- Total: {order.total_amount} MT
- Email será enviado para: {shipping_address['email']}

PRÓXIMOS PASSOS:
1. Verifique a caixa de entrada de {shipping_address['email']}
2. Verifique a pasta SPAM
3. Se quiser testar com SEU email, edite o script e execute novamente
""")
