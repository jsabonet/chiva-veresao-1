#!/usr/bin/env python
"""
Script para simular um pagamento falhado e testar a detecção de erros
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment, Order
from django.utils import timezone

# Buscar um pagamento pendente para simular falha
payment = Payment.objects.filter(status='pending').first()

if not payment:
    print("❌ Nenhum pagamento pendente encontrado")
    exit(1)

print(f"📍 Pagamento encontrado: #{payment.id}")
print(f"   Status atual: {payment.status}")
print(f"   PaySuite Ref: {payment.paysuite_reference}")
print(f"   Order: #{payment.order.id if payment.order else 'N/A'}")

# Simular resposta de erro do PaySuite
error_response = {
    'status': 'error',
    'message': 'Pagamento recusado pelo operador móvel. Saldo insuficiente.',
    'code': 'INSUFFICIENT_FUNDS',
    'polled_at': timezone.now().isoformat()
}

# Atualizar o pagamento para simular falha detectada por polling
payment.status = 'failed'
payment.raw_response = {
    **payment.raw_response,
    'polled_at': timezone.now().isoformat(),
    'polled_response': error_response,
    'error_message': error_response['message']
}
payment.save(update_fields=['status', 'raw_response'])

# Atualizar ordem também
if payment.order:
    payment.order.status = 'failed'
    payment.order.save(update_fields=['status'])
    print(f"✅ Order #{payment.order.id} marcada como 'failed'")

print(f"✅ Payment #{payment.id} marcado como 'failed'")
print(f"✅ Mensagem de erro: {error_response['message']}")
print(f"\n🌐 Agora abra: https://chivacomputer.co.mz/order/{payment.order.id if payment.order else payment.id}")
print(f"   Você deve ver a mensagem de erro e os botões de ação!")
