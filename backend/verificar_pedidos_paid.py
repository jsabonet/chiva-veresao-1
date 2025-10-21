#!/usr/bin/env python
"""
Verificar Pedidos Recentes com Mudança de Status
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Order, Payment
from django.utils import timezone
from datetime import timedelta

print("\n" + "=" * 80)
print("🔍 VERIFICANDO PEDIDOS QUE MUDARAM PARA 'PAID' RECENTEMENTE")
print("=" * 80)

# Pedidos das últimas 2 horas
recent_time = timezone.now() - timedelta(hours=2)
recent_orders = Order.objects.filter(
    updated_at__gte=recent_time
).order_by('-updated_at')

print(f"\n📊 Pedidos atualizados nas últimas 2 horas: {recent_orders.count()}")
print("-" * 80)

for order in recent_orders:
    payment = order.payments.first()
    
    print(f"\n#{order.order_number}")
    print(f"   Status: {order.status}")
    print(f"   Email: {order.shipping_address.get('email', 'N/A')}")
    print(f"   Criado: {order.created_at.strftime('%H:%M:%S')}")
    print(f"   Atualizado: {order.updated_at.strftime('%H:%M:%S')}")
    
    if payment:
        print(f"   Payment:")
        print(f"      Status: {payment.status}")
        print(f"      Ref: {payment.paysuite_reference}")
        print(f"      Poll Count: {payment.poll_count}")
        print(f"      Last Polled: {payment.last_polled_at.strftime('%H:%M:%S') if payment.last_polled_at else 'Nunca'}")
        
        # Verificar raw_response
        if payment.raw_response:
            polled_response = payment.raw_response.get('polled_response')
            if polled_response:
                print(f"      Polled Response: {polled_response.get('status', 'N/A')}")

print("\n" + "=" * 80)
print("📧 PEDIDOS QUE DEVEM TER RECEBIDO EMAILS")
print("=" * 80)

paid_orders = Order.objects.filter(
    status='paid',
    created_at__gte=recent_time
).order_by('-created_at')

print(f"\nPedidos com status='paid' (últimas 2h): {paid_orders.count()}")

for order in paid_orders:
    payment = order.payments.first()
    email = order.shipping_address.get('email', 'N/A')
    
    print(f"\n✅ #{order.order_number}")
    print(f"   Email: {email}")
    print(f"   Total: {order.total_amount} MT")
    print(f"   Payment Ref: {payment.paysuite_reference if payment else 'N/A'}")
    print(f"   ⚠️  Email deveria ter sido enviado para: {email}")

print("\n" + "=" * 80)
