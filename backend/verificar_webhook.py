#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Order, Payment

# Verificar pedido
order = Order.objects.get(order_number='CHV202510180001')
payment = Payment.objects.filter(order=order).first()

print("=" * 80)
print("🔍 VERIFICAÇÃO PÓS-WEBHOOK")
print("=" * 80)
print()
print(f"📦 Pedido: #{order.order_number}")
print(f"📊 Status do Pedido: {order.status}")
print(f"💳 Status do Pagamento: {payment.status if payment else 'N/A'}")
print(f"📧 Email: {order.shipping_address.get('email', 'N/A') if order.shipping_address else 'N/A'}")
print(f"👤 Nome: {order.shipping_address.get('name', 'N/A') if order.shipping_address else 'N/A'}")
print()

if order.status == 'paid' and payment and payment.status == 'paid':
    print("✅ WEBHOOK FUNCIONOU!")
    print()
    print("📧 OS SEGUINTES EMAILS DEVEM TER SIDO ENVIADOS:")
    print()
    email = order.shipping_address.get('email', '') if order.shipping_address else ''
    print(f"   1. ✅ Confirmação de Pedido → {email}")
    print(f"   2. ✅ Pagamento Aprovado (verde) → {email}")
    print(f"   3. ✅ Notificação para Admin → jsabonete09@gmail.com")
    print()
    print(f"📬 VERIFIQUE SEU EMAIL AGORA: {email}")
    print("   (Pode estar na pasta Spam/Lixo Eletrônico)")
    print()
else:
    print("⚠️ Algo deu errado")
    print(f"   Status esperado: 'paid'")
    print(f"   Status atual: '{order.status}'")

print("=" * 80)
