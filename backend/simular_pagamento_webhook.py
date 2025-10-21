#!/usr/bin/env python
"""
Script para SIMULAR um pagamento completo e disparar o webhook manualmente

Isso é útil para:
1. Testar o sistema de emails sem fazer pagamento real
2. Debugar o fluxo de webhook
3. Verificar se os emails estão sendo enviados corretamente
"""

import os
import sys
import django
import json
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.test import RequestFactory
from cart.models import Order, Payment, Cart, CartItem
from cart.views import paysuite_webhook
from products.models import Product

def criar_pedido_teste():
    """
    Cria um pedido de teste completo com carrinho e itens
    """
    print("=" * 80)
    print("🛒 CRIANDO PEDIDO DE TESTE")
    print("=" * 80)
    print()
    
    # Obter ou criar um produto para teste
    product = Product.objects.first()
    if not product:
        print("❌ Nenhum produto encontrado. Crie produtos primeiro.")
        return None
    
    print(f"✅ Produto: {product.name} - {product.price} MZN")
    
    # Obter email do cliente
    customer_email = input("\n📧 Digite o email do cliente (ou ENTER para jsabonete09@gmail.com): ").strip()
    if not customer_email:
        customer_email = "jsabonete09@gmail.com"
    
    customer_name = input("👤 Digite o nome do cliente (ou ENTER para 'Cliente Teste'): ").strip()
    if not customer_name:
        customer_name = "Cliente Teste"
    
    print()
    print("-" * 80)
    print("🎯 Dados do pedido:")
    print(f"   Cliente: {customer_name}")
    print(f"   Email: {customer_email}")
    print(f"   Produto: {product.name}")
    print(f"   Preço: {product.price} MZN")
    print("-" * 80)
    print()
    
    confirm = input("Criar pedido de teste? (s/N): ").strip().lower()
    if confirm != 's':
        print("❌ Cancelado")
        return None
    
    # Criar carrinho
    cart = Cart.objects.create(
        user=None,  # Anonymous cart
        status='active',
        total=product.price
    )
    print(f"✅ Carrinho criado: ID {cart.id}")
    
    # Adicionar item ao carrinho
    cart_item = CartItem.objects.create(
        cart=cart,
        product=product,
        quantity=1,
        price=product.price
    )
    print(f"✅ Item adicionado: {product.name} x1")
    
    # Criar pedido
    order = Order.objects.create(
        cart=cart,
        user=None,
        total_amount=product.price,
        shipping_cost=Decimal('0.00'),
        status='pending',
        shipping_method='standard',
        shipping_address={
            'name': customer_name,
            'email': customer_email,
            'phone': '+258840000000',
            'address': 'Nampula Shopping 1 andar loja 20',
            'city': 'Nampula',
            'province': 'Nampula'
        },
        billing_address={
            'name': customer_name,
            'email': customer_email,
            'phone': '+258840000000',
            'address': 'Nampula Shopping 1 andar loja 20',
            'city': 'Nampula',
            'province': 'Nampula'
        }
    )
    print(f"✅ Pedido criado: #{order.order_number} (ID: {order.id})")
    
    # Criar OrderItems
    from cart.models import OrderItem
    order_item = OrderItem.objects.create(
        order=order,
        product=product,
        product_name=product.name,
        sku=getattr(product, 'sku', ''),
        quantity=1,
        unit_price=product.price,
        subtotal=product.price
    )
    print(f"✅ OrderItem criado: {product.name}")
    
    # Criar pagamento
    payment = Payment.objects.create(
        order=order,
        cart=cart,
        amount=product.price,
        status='pending',
        payment_method='mpesa',
        paysuite_reference=f'TEST_{order.id}_{cart.id}',
        request_data={
            'amount': float(product.price),
            'currency': 'MZN',
            'customer_name': customer_name,
            'customer_email': customer_email,
            'shipping_address': order.shipping_address,
            'billing_address': order.billing_address,
            'shipping_method': 'standard',
            'items': [{
                'product_id': product.id,
                'name': product.name,
                'quantity': 1,
                'price': float(product.price)
            }]
        }
    )
    print(f"✅ Pagamento criado: ID {payment.id} - Referência: {payment.paysuite_reference}")
    
    print()
    print("=" * 80)
    print("✅ PEDIDO DE TESTE CRIADO COM SUCESSO!")
    print("=" * 80)
    print()
    print(f"📦 Pedido: #{order.order_number}")
    print(f"💳 Payment ID: {payment.id}")
    print(f"🔗 Referência: {payment.paysuite_reference}")
    print(f"💰 Valor: {order.total_amount} MZN")
    print(f"📧 Email: {customer_email}")
    print()
    
    return {
        'order': order,
        'payment': payment,
        'cart': cart,
        'customer_email': customer_email,
        'customer_name': customer_name
    }


def simular_webhook_paysuite(payment, event_type='payment.success'):
    """
    Simula um webhook do PaySuite
    
    Args:
        payment: Objeto Payment
        event_type: 'payment.success', 'payment.failed', ou 'payment.pending'
    """
    print("=" * 80)
    print(f"🔔 SIMULANDO WEBHOOK DO PAYSUITE - {event_type}")
    print("=" * 80)
    print()
    
    # Criar payload do webhook (formato PaySuite)
    webhook_payload = {
        'event': event_type,
        'data': {
            'id': payment.paysuite_reference,
            'reference': payment.paysuite_reference,
            'amount': float(payment.amount),
            'currency': 'MZN',
            'status': 'paid' if event_type == 'payment.success' else 'failed',
            'payment_method': payment.method,  # Campo correto é 'method'
            'created_at': payment.created_at.isoformat() if payment.created_at else None
        },
        'metadata': {
            'order_id': payment.order.id if payment.order else None
        }
    }
    
    print("📨 Payload do webhook:")
    print(json.dumps(webhook_payload, indent=2))
    print()
    
    # Criar requisição fake usando RequestFactory
    factory = RequestFactory()
    request = factory.post(
        '/api/cart/payments/webhook/',
        data=json.dumps(webhook_payload),
        content_type='application/json'
    )
    
    # Adicionar body para verificação de assinatura
    request._body = json.dumps(webhook_payload).encode('utf-8')
    
    print("🚀 Disparando webhook...")
    print()
    
    try:
        # Chamar a view do webhook
        response = paysuite_webhook(request)
        
        print("-" * 80)
        print(f"📊 RESPOSTA DO WEBHOOK:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.data if hasattr(response, 'data') else 'N/A'}")
        print("-" * 80)
        print()
        
        if response.status_code == 200:
            print("✅ WEBHOOK PROCESSADO COM SUCESSO!")
            return True
        else:
            print(f"⚠️ Webhook retornou status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERRO ao processar webhook: {e}")
        import traceback
        traceback.print_exc()
        return False


def verificar_resultado(order_id, customer_email):
    """
    Verifica se o pedido foi atualizado e os emails foram enviados
    """
    print()
    print("=" * 80)
    print("🔍 VERIFICANDO RESULTADO")
    print("=" * 80)
    print()
    
    # Recarregar order do banco
    order = Order.objects.get(id=order_id)
    payment = Payment.objects.filter(order=order).first()
    
    print(f"📦 Status do Pedido: {order.status}")
    print(f"💳 Status do Pagamento: {payment.status if payment else 'N/A'}")
    print()
    
    if order.status == 'paid' and payment and payment.status == 'paid':
        print("✅ PEDIDO CONFIRMADO COM SUCESSO!")
        print()
        print("📧 EMAILS QUE DEVEM TER SIDO ENVIADOS:")
        print()
        print(f"   1. ✅ Confirmação de Pedido → {customer_email}")
        print(f"   2. ✅ Pagamento Aprovado → {customer_email}")
        print(f"   3. ✅ Notificação Admin → (email configurado no settings)")
        print()
        print(f"📬 Verifique a caixa de entrada (ou spam) de: {customer_email}")
        print()
        return True
    else:
        print("⚠️ Pedido não foi confirmado")
        print("   Verifique os logs acima para ver o que aconteceu")
        return False


def main():
    print()
    print("=" * 80)
    print("🧪 SIMULADOR DE PAGAMENTO + WEBHOOK")
    print("=" * 80)
    print()
    print("Este script vai:")
    print("  1. Criar um pedido de teste completo")
    print("  2. Simular um webhook do PaySuite")
    print("  3. Disparar os emails automáticos")
    print("  4. Verificar se tudo funcionou")
    print()
    print("=" * 80)
    print()
    
    # Opção 1: Criar novo pedido
    print("OPÇÃO 1: Criar novo pedido de teste")
    print("OPÇÃO 2: Usar pedido existente")
    print()
    
    opcao = input("Escolha uma opção (1 ou 2): ").strip()
    
    if opcao == '1':
        # Criar novo pedido
        result = criar_pedido_teste()
        if not result:
            return
        
        order = result['order']
        payment = result['payment']
        customer_email = result['customer_email']
        
    elif opcao == '2':
        # Usar pedido existente
        print()
        print("📦 PEDIDOS RECENTES:")
        recent_orders = Order.objects.all().order_by('-created_at')[:10]
        
        if not recent_orders.exists():
            print("❌ Nenhum pedido encontrado")
            return
        
        for i, order in enumerate(recent_orders, 1):
            email = order.shipping_address.get('email', 'N/A') if order.shipping_address else 'N/A'
            print(f"{i}. Pedido #{order.order_number} - Status: {order.status} - Email: {email}")
        
        print()
        order_num = input("Digite o número do pedido (1-10): ").strip()
        
        try:
            order_idx = int(order_num) - 1
            order = list(recent_orders)[order_idx]
            payment = Payment.objects.filter(order=order).first()
            
            if not payment:
                print("❌ Pagamento não encontrado para este pedido")
                return
            
            customer_email = order.shipping_address.get('email', '') if order.shipping_address else ''
            
            print()
            print(f"✅ Usando pedido #{order.order_number}")
            print(f"   Payment ID: {payment.id}")
            print(f"   Email: {customer_email}")
            print()
            
        except (ValueError, IndexError):
            print("❌ Número inválido")
            return
    else:
        print("❌ Opção inválida")
        return
    
    # Escolher tipo de webhook
    print()
    print("TIPO DE WEBHOOK:")
    print("  1. payment.success (Pagamento aprovado) ✅")
    print("  2. payment.failed (Pagamento falhou) ❌")
    print("  3. payment.pending (Pagamento pendente) ⏳")
    print()
    
    webhook_type = input("Escolha o tipo (1, 2 ou 3): ").strip()
    
    event_types = {
        '1': 'payment.success',
        '2': 'payment.failed',
        '3': 'payment.pending'
    }
    
    event_type = event_types.get(webhook_type, 'payment.success')
    
    print()
    confirm = input(f"🚀 Disparar webhook '{event_type}' para pedido #{order.order_number}? (s/N): ").strip().lower()
    
    if confirm != 's':
        print("❌ Cancelado")
        return
    
    print()
    
    # Simular webhook
    success = simular_webhook_paysuite(payment, event_type)
    
    if success:
        # Verificar resultado
        verificar_resultado(order.id, customer_email)
    
    print()
    print("=" * 80)
    print("✅ SIMULAÇÃO COMPLETA")
    print("=" * 80)
    print()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelado pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
