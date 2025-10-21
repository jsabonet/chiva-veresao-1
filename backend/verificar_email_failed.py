#!/usr/bin/env python
"""
Verificar se o email de falha foi enviado
"""
import os
import django
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment, Order

# Buscar o último payment failed
payment = Payment.objects.filter(status='failed').order_by('-id').first()

if payment:
    print(f"\n=== Payment #{payment.id} ===")
    print(f"Status: {payment.status}")
    print(f"Reference: {payment.paysuite_reference}")
    print(f"Order ID: {payment.order_id}")
    
    if payment.order:
        print(f"\n=== Order #{payment.order.id} ===")
        print(f"Status: {payment.order.status}")
        print(f"Customer: {payment.order.shipping_address.get('name', 'N/A')}")
        print(f"Email: {payment.order.shipping_address.get('email', 'N/A')}")
    
    # Verificar raw_response
    if payment.raw_response:
        print(f"\n=== Webhook Data ===")
        import json
        print(json.dumps(payment.raw_response, indent=2))
    
    print("\n" + "="*80)
    print("TESTE DE EMAIL:")
    print("="*80)
    
    # Testar envio de email manualmente
    from cart.email_service import get_email_service
    email_service = get_email_service()
    
    customer_email = payment.order.shipping_address.get('email', '')
    customer_name = payment.order.shipping_address.get('name', 'Cliente')
    
    if customer_email:
        print(f"\nEnviando email de falha para: {customer_email}")
        try:
            result = email_service.send_payment_status_update(
                order=payment.order,
                payment_status='failed',
                customer_email=customer_email,
                customer_name=customer_name
            )
            print(f"Resultado: {result}")
        except Exception as e:
            print(f"ERRO: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("ERRO: Email do cliente não encontrado")
else:
    print("Nenhum payment failed encontrado")
