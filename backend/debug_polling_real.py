#!/usr/bin/env python
"""
Debug Polling Real - Simula Exatamente o que OrderConfirmation.tsx faz
=====================================================================
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Order, Payment
from django.contrib.auth.models import User

print("\n" + "=" * 80)
print("🔍 DEBUG POLLING REAL")
print("=" * 80)

# 1. Verificar últimos pedidos
print("\n📋 Últimos 5 pedidos:")
print("-" * 80)

recent_orders = Order.objects.all().order_by('-created_at')[:5]

for order in recent_orders:
    payment = order.payments.first()
    print(f"\n#{order.order_number}")
    print(f"   Status: {order.status}")
    print(f"   Email: {order.shipping_address.get('email', 'N/A')}")
    print(f"   Criado: {order.created_at}")
    if payment:
        print(f"   Payment ID: {payment.id}")
        print(f"   Payment Status: {payment.status}")
        print(f"   PaySuite Ref: {payment.paysuite_reference}")
        print(f"   Poll Count: {payment.poll_count}")

# 2. Perguntar qual pedido debugar
print("\n" + "=" * 80)
order_number = input("Digite o número do pedido para debugar (ex: CHV202510210001): ").strip()

try:
    order = Order.objects.get(order_number=order_number)
    print(f"\n✅ Pedido encontrado: #{order.order_number}")
except Order.DoesNotExist:
    print(f"\n❌ Pedido {order_number} não encontrado!")
    sys.exit(1)

# 3. Simular polling
print("\n" + "=" * 80)
print("🔄 SIMULANDO POLLING (como OrderConfirmation.tsx)")
print("=" * 80)

from django.test import RequestFactory
from cart.views import payment_status

# Criar usuário mock ou usar o do pedido
user = order.user
if not user:
    print("⚠️  Pedido sem usuário - criando usuário temporário")
    user, _ = User.objects.get_or_create(
        username='test_polling_user',
        defaults={'email': 'test@polling.com'}
    )
    order.user = user
    order.save()

factory = RequestFactory()
request = factory.get(f'/api/cart/orders/{order.id}/payment-status/')
request.user = user

print(f"📤 GET /api/cart/orders/{order.id}/payment-status/")
print(f"   User: {user.email}")

# 4. Executar a view com logs detalhados
print("\n🔍 Resposta do endpoint:\n")

try:
    # Capturar stdout para ver os prints
    from io import StringIO
    import sys
    
    old_stdout = sys.stdout
    sys.stdout = StringIO()
    
    response = payment_status(request, order_id=order.id)
    
    logs = sys.stdout.getvalue()
    sys.stdout = old_stdout
    
    # Mostrar logs capturados
    if logs:
        print("📝 Logs do processamento:")
        for line in logs.split('\n'):
            if line.strip():
                print(f"   {line}")
    
    print(f"\n✅ Status Code: {response.status_code}")
    print(f"📦 Response Data:")
    
    import json
    data = json.loads(response.content.decode('utf-8'))
    print(json.dumps(data, indent=2, ensure_ascii=False))
    
except Exception as e:
    sys.stdout = old_stdout
    print(f"\n❌ Erro ao processar: {e}")
    import traceback
    traceback.print_exc()

# 5. Verificar estado final
print("\n" + "=" * 80)
print("📊 ESTADO FINAL")
print("=" * 80)

order.refresh_from_db()
payment = order.payments.first()

print(f"\nOrder Status: {order.status}")
if payment:
    payment.refresh_from_db()
    print(f"Payment Status: {payment.status}")
    print(f"Poll Count: {payment.poll_count}")
    print(f"Last Polled: {payment.last_polled_at}")

# 6. Verificar se deve enviar emails
print("\n" + "=" * 80)
print("📧 ANÁLISE DE ENVIO DE EMAILS")
print("=" * 80)

customer_email = order.shipping_address.get('email', '')
print(f"\nEmail do cliente: {customer_email}")
print(f"Order status: {order.status}")

if order.status == 'paid':
    print("\n✅ Status é 'paid' - Emails DEVEM ter sido enviados!")
    print("\nEmails esperados:")
    print("   1. ✉️  Order Confirmation → Cliente")
    print("   2. ✉️  Payment Status Update (paid) → Cliente")
    print("   3. ✉️  New Order Notification → Admin")
    print(f"\nPara: {customer_email}")
elif order.status == 'failed':
    print("\n⚠️  Status é 'failed' - Email de falha DEVE ter sido enviado!")
    print(f"\nPara: {customer_email}")
else:
    print(f"\n⏳ Status é '{order.status}' - Ainda pendente, emails NÃO foram enviados")

print("\n" + "=" * 80)
print("\n💡 DICA: Verifique:")
print("   1. Caixa de entrada de", customer_email)
print("   2. Pasta SPAM")
print("   3. Dashboard Brevo: https://app.brevo.com/")
print("   4. Logs do servidor Django (procure por '📧 [POLLING]')")
print("\n" + "=" * 80)
