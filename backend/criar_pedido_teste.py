#!/usr/bin/env python
"""
Script rápido para criar pedidos de teste no e-commerce
Execute: python criar_pedido_teste.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth.models import User
from cart.models import Cart, CartItem, Order, Payment
from products.models import Product, Color
from decimal import Decimal
import json
from datetime import datetime


def criar_pedido_teste():
    """Criar um pedido de teste completo"""
    print("🚀 Criando pedido de teste...")
    
    # 1. Criar/obter usuário de teste
    user, created = User.objects.get_or_create(
        email='teste@exemplo.com',
        defaults={
            'username': 'usuario_teste',
            'first_name': 'Cliente',
            'last_name': 'Teste'
        }
    )
    print(f"👤 Usuário: {user.email} {'(criado)' if created else '(existente)'}")
    
    # 2. Limpar dados anteriores
    Cart.objects.filter(user=user, status='active').delete()
    
    # 3. Criar carrinho
    cart = Cart.objects.create(user=user, status='active')
    
    # 4. Adicionar produtos
    produtos = Product.objects.filter(status='active')[:2]
    total_items = 0
    
    for produto in produtos:
        cor = produto.colors.filter(is_active=True).first()
        quantidade = 2
        
        CartItem.objects.create(
            cart=cart,
            product=produto,
            color=cor,
            quantity=quantidade,
            price=produto.price
        )
        
        total_items += quantidade
        print(f"📦 Adicionado: {produto.name} x{quantidade} - {produto.price * quantidade} MZN")
    
    # 5. Calcular totais
    cart.calculate_totals()
    
    # 6. Criar pedido
    endereco = {
        'name': 'Cliente Teste',
        'street': 'Avenida Teste, 123',
        'city': 'Maputo',
        'state': 'Maputo',
        'postal_code': '1100',
        'country': 'Moçambique'
    }
    
    order = Order.objects.create(
        user=user,
        cart=cart,
        total_amount=cart.total,
        shipping_cost=Decimal('50.00'),
        status='pending',
        shipping_method='standard',
        shipping_address=json.dumps(endereco),
        billing_address=json.dumps(endereco),
        customer_notes='Pedido de teste criado automaticamente'
    )
    
    # 7. Criar pagamento simulado
    payment = Payment.objects.create(
        order=order,
        method='emola',
        amount=order.total_amount + order.shipping_cost,
        currency='MZN',
        paysuite_reference=f'TESTE_{order.id}_{int(datetime.now().timestamp())}',
        status='completed',
        raw_response=json.dumps({
            'status': 'completed',
            'message': 'Pagamento teste aprovado automaticamente',
            'test_mode': True,
            'timestamp': datetime.now().isoformat()
        })
    )
    
    # 8. Atualizar status do pedido
    order.status = 'paid'
    order.save()
    
    # 9. Marcar carrinho como completado
    cart.status = 'completed'
    cart.save()
    
    # 10. Mostrar resultados
    print("\n" + "="*50)
    print("✅ PEDIDO DE TESTE CRIADO COM SUCESSO!")
    print("="*50)
    print(f"🔢 Número do Pedido: #{order.order_number}")
    print(f"👤 Cliente: {user.email}")
    print(f"📦 Itens: {total_items}")
    print(f"💰 Subtotal: {cart.subtotal} MZN")
    print(f"🚚 Frete: {order.shipping_cost} MZN")
    print(f"💳 Total: {order.total_amount + order.shipping_cost} MZN")
    print(f"📊 Status: {order.get_status_display()}")
    print(f"💳 Pagamento: {payment.paysuite_reference}")
    print("\n🌐 TESTE NO FRONTEND:")
    print(f"   • Login: {user.email}")
    print(f"   • URL: http://localhost:5173/meus-pedidos")
    print(f"   • Pedido: #{order.order_number}")
    print("="*50)
    
    return order


def criar_multiplos_pedidos(quantidade=3):
    """Criar múltiplos pedidos de teste"""
    print(f"🔄 Criando {quantidade} pedidos de teste...")
    
    pedidos = []
    for i in range(quantidade):
        print(f"\n--- Pedido {i+1}/{quantidade} ---")
        try:
            pedido = criar_pedido_teste()
            pedidos.append(pedido)
        except Exception as e:
            print(f"❌ Erro ao criar pedido {i+1}: {e}")
    
    print(f"\n🎉 Criados {len(pedidos)} pedidos com sucesso!")
    return pedidos


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Criar pedidos de teste')
    parser.add_argument('--quantidade', '-q', type=int, default=1, 
                       help='Quantidade de pedidos para criar (padrão: 1)')
    
    args = parser.parse_args()
    
    try:
        if args.quantidade == 1:
            criar_pedido_teste()
        else:
            criar_multiplos_pedidos(args.quantidade)
    except KeyboardInterrupt:
        print("\n⏹️ Operação cancelada pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro: {e}")