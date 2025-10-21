#!/usr/bin/env python
"""
Verificar Última Compra - Debug de Emails
==========================================
Verifica se os emails foram enviados na última compra.
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
print("🔍 VERIFICANDO ÚLTIMA COMPRA")
print("=" * 80)

# Pegar pedidos recentes (últimas 24 horas)
recent_time = timezone.now() - timedelta(hours=24)
recent_orders = Order.objects.filter(
    created_at__gte=recent_time
).order_by('-created_at')

print(f"\n📊 Pedidos nas últimas 24 horas: {recent_orders.count()}")

if not recent_orders.exists():
    print("❌ Nenhum pedido encontrado nas últimas 24 horas")
    sys.exit(0)

print("\n" + "=" * 80)
print("📋 DETALHES DOS PEDIDOS RECENTES")
print("=" * 80)

for order in recent_orders[:5]:  # Mostrar até 5 mais recentes
    print(f"\n{'='*80}")
    print(f"Pedido: #{order.order_number}")
    print(f"ID: {order.id}")
    print(f"Status: {order.status}")
    print(f"Total: {order.total_amount} MT")
    print(f"Criado: {order.created_at}")
    print(f"Email do Cliente: {order.shipping_address.get('email', 'N/A')}")
    
    # Verificar pagamentos
    payments = order.payments.all().order_by('-created_at')
    print(f"\n💳 Pagamentos: {payments.count()}")
    
    for payment in payments:
        print(f"  - Payment ID: {payment.id}")
        print(f"    Status: {payment.status}")
        print(f"    Método: {payment.method}")
        print(f"    Referência: {payment.paysuite_reference}")
        print(f"    Criado: {payment.created_at}")
        print(f"    Atualizado: {payment.updated_at}")
        print(f"    Poll Count: {payment.poll_count}")
        print(f"    Last Polled: {payment.last_polled_at}")
    
    # Verificar OrderItems
    items = order.items.all()
    print(f"\n📦 OrderItems: {items.count()}")
    for item in items:
        print(f"  - {item.product_name} x {item.quantity} = {item.subtotal} MT")

print("\n" + "=" * 80)
print("🔍 ANÁLISE DO PROBLEMA")
print("=" * 80)

# Pegar o pedido mais recente com status 'paid'
latest_paid = Order.objects.filter(
    status='paid',
    created_at__gte=recent_time
).order_by('-created_at').first()

if not latest_paid:
    print("\n❌ Nenhum pedido 'paid' encontrado recentemente")
    print("   Isso explica por que não recebeu email!")
else:
    print(f"\n✅ Pedido PAID mais recente: #{latest_paid.order_number}")
    print(f"   ID: {latest_paid.id}")
    print(f"   Status: {latest_paid.status}")
    print(f"   Email: {latest_paid.shipping_address.get('email')}")
    
    payment = latest_paid.payments.first()
    if payment:
        print(f"\n💳 Detalhes do Pagamento:")
        print(f"   Status: {payment.status}")
        print(f"   Poll Count: {payment.poll_count}")
        print(f"   Last Polled: {payment.last_polled_at}")
        
        # Verificar raw_response para ver se polling aconteceu
        if payment.raw_response:
            print(f"\n📝 Raw Response Keys: {list(payment.raw_response.keys())}")
            if 'polled_at' in payment.raw_response:
                print(f"   ✅ Polling aconteceu em: {payment.raw_response['polled_at']}")
            else:
                print(f"   ⚠️  Nenhuma evidência de polling na raw_response")

print("\n" + "=" * 80)
print("🧪 TESTE MANUAL DE ENVIO DE EMAIL")
print("=" * 80)

if latest_paid:
    print(f"\nVou tentar enviar email AGORA para o pedido #{latest_paid.order_number}")
    
    try:
        from cart.email_service import get_email_service
        email_service = get_email_service()
        
        customer_email = latest_paid.shipping_address.get('email', '')
        customer_name = latest_paid.shipping_address.get('name', 'Cliente')
        
        if not customer_email:
            print("❌ Email do cliente não encontrado!")
        else:
            print(f"📧 Enviando email para: {customer_email}")
            
            # Tentar enviar email de confirmação
            result = email_service.send_order_confirmation(
                order=latest_paid,
                customer_email=customer_email,
                customer_name=customer_name
            )
            
            if result:
                print(f"✅ Email de confirmação enviado com SUCESSO!")
            else:
                print(f"❌ Falha ao enviar email de confirmação")
            
            # Tentar enviar email de pagamento
            result2 = email_service.send_payment_status_update(
                order=latest_paid,
                payment_status='paid',
                customer_email=customer_email,
                customer_name=customer_name
            )
            
            if result2:
                print(f"✅ Email de status de pagamento enviado com SUCESSO!")
            else:
                print(f"❌ Falha ao enviar email de status de pagamento")
                
    except Exception as e:
        print(f"❌ ERRO ao tentar enviar emails: {e}")
        import traceback
        traceback.print_exc()

print("\n" + "=" * 80)
print("💡 RECOMENDAÇÕES")
print("=" * 80)

print("""
Se o email foi enviado AGORA no teste manual mas não foi durante a compra:

1. ✅ Sistema de emails está FUNCIONANDO
2. ❌ Código de polling NÃO está executando o envio

CAUSAS POSSÍVEIS:
- Exception silenciosa no bloco try-except
- Condição que impede a execução
- payment.order é None
- shipping_address['email'] está vazio

SOLUÇÃO:
Adicionar logs mais detalhados no código de polling para identificar
onde exatamente o fluxo está falhando.

Verifique:
1. Pasta SPAM do email
2. Dashboard do Brevo (https://app.brevo.com/)
3. Logs do servidor Django durante a compra
""")

print("\n" + "=" * 80)
