#!/usr/bin/env python
"""
Script para FORÇAR envio de emails de um pedido específico
Útil para testes ou reenvio de emails
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Order, Payment
from cart.email_service import get_email_service

def force_send_emails(order_id):
    """
    Força o envio de todos os emails de um pedido
    """
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        print(f"❌ Pedido #{order_id} não encontrado")
        return False
    
    print("=" * 80)
    print(f"📧 FORÇANDO ENVIO DE EMAILS PARA PEDIDO #{order.order_number}")
    print("=" * 80)
    print()
    print(f"📦 Pedido: #{order.order_number} (ID: {order.id})")
    print(f"💰 Valor: {order.total_amount} MZN")
    print(f"📊 Status: {order.status}")
    print(f"👤 Cliente: {order.shipping_address.get('name', 'N/A') if order.shipping_address else 'N/A'}")
    print(f"📧 Email: {order.shipping_address.get('email', 'N/A') if order.shipping_address else 'N/A'}")
    print()
    
    # Obter dados do cliente
    customer_email = order.shipping_address.get('email', '') if order.shipping_address else ''
    customer_name = order.shipping_address.get('name', 'Cliente') if order.shipping_address else 'Cliente'
    
    if not customer_email:
        print("❌ Email do cliente não encontrado no pedido")
        override_email = input("Digite um email para receber os emails de teste: ").strip()
        if override_email:
            customer_email = override_email
        else:
            print("❌ Cancelado - sem email")
            return False
    
    print(f"🎯 Emails serão enviados para: {customer_email}")
    print()
    
    # Confirmar
    confirm = input("Deseja continuar? (s/N): ").strip().lower()
    if confirm != 's':
        print("❌ Cancelado pelo usuário")
        return False
    
    print()
    print("-" * 80)
    print("📨 ENVIANDO EMAILS...")
    print("-" * 80)
    
    email_service = get_email_service()
    results = []
    
    # 1. Confirmação de pedido
    print("\n1️⃣ Enviando confirmação de pedido...")
    try:
        result = email_service.send_order_confirmation(
            order=order,
            customer_email=customer_email,
            customer_name=customer_name
        )
        if result:
            print("   ✅ Confirmação de pedido enviada")
            results.append(True)
        else:
            print("   ❌ Falha ao enviar confirmação")
            results.append(False)
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        results.append(False)
    
    # 2. Status de pagamento
    print("\n2️⃣ Enviando status de pagamento...")
    try:
        # Determinar status baseado no pedido
        payment_status = order.status if order.status in ['paid', 'pending', 'failed'] else 'pending'
        
        result = email_service.send_payment_status_update(
            order=order,
            payment_status=payment_status,
            customer_email=customer_email,
            customer_name=customer_name
        )
        if result:
            print(f"   ✅ Status de pagamento enviado ({payment_status})")
            results.append(True)
        else:
            print("   ❌ Falha ao enviar status")
            results.append(False)
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        results.append(False)
    
    # 3. Notificação para admin
    print("\n3️⃣ Enviando notificação para admin...")
    try:
        result = email_service.send_new_order_notification_to_admin(order=order)
        if result:
            print("   ✅ Notificação admin enviada")
            results.append(True)
        else:
            print("   ❌ Falha ao enviar notificação admin")
            results.append(False)
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        results.append(False)
    
    # 4. Email de envio (se aplicável)
    if order.status in ['shipped', 'delivered']:
        print("\n4️⃣ Enviando atualização de envio...")
        try:
            result = email_service.send_shipping_update(
                order=order,
                customer_email=customer_email,
                customer_name=customer_name,
                tracking_number=None  # Você pode adicionar tracking se tiver
            )
            if result:
                print("   ✅ Atualização de envio enviada")
                results.append(True)
            else:
                print("   ❌ Falha ao enviar atualização")
                results.append(False)
        except Exception as e:
            print(f"   ❌ Erro: {e}")
            results.append(False)
    
    # Resumo
    print()
    print("=" * 80)
    print("📊 RESUMO")
    print("=" * 80)
    success_count = sum(results)
    total_count = len(results)
    print(f"✅ Enviados com sucesso: {success_count}/{total_count}")
    print(f"❌ Falhas: {total_count - success_count}/{total_count}")
    print()
    
    if success_count > 0:
        print(f"📧 Verifique a caixa de entrada (ou spam) de: {customer_email}")
    
    return success_count == total_count


if __name__ == '__main__':
    print()
    print("=" * 80)
    print("📧 FORÇAR ENVIO DE EMAILS DE UM PEDIDO")
    print("=" * 80)
    print()
    
    # Listar pedidos recentes
    recent_orders = Order.objects.all().order_by('-created_at')[:10]
    
    if not recent_orders.exists():
        print("❌ Nenhum pedido encontrado no sistema")
        sys.exit(1)
    
    print("📦 PEDIDOS RECENTES:")
    print()
    for i, order in enumerate(recent_orders, 1):
        email = order.shipping_address.get('email', 'N/A') if order.shipping_address else 'N/A'
        print(f"{i}. Pedido #{order.order_number} (ID: {order.id})")
        print(f"   Status: {order.status} | Email: {email}")
    
    print()
    print("-" * 80)
    
    # Pedir ID do pedido
    try:
        order_id = input("\nDigite o ID do pedido (ou número da lista): ").strip()
        
        # Se for um número de 1-10, pegar da lista
        if order_id.isdigit() and 1 <= int(order_id) <= len(recent_orders):
            order = list(recent_orders)[int(order_id) - 1]
            order_id = order.id
        
        order_id = int(order_id)
        
        # Executar
        success = force_send_emails(order_id)
        
        if success:
            print()
            print("🎉 TODOS OS EMAILS ENVIADOS COM SUCESSO!")
        else:
            print()
            print("⚠️ Alguns emails falharam. Verifique os erros acima.")
        
    except ValueError:
        print("❌ ID inválido")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n❌ Cancelado pelo usuário")
        sys.exit(1)
