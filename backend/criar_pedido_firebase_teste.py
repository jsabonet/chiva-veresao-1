#!/usr/bin/env python
"""
Script para criar pedidos de teste compatíveis com Firebase Auth
Execute: python criar_pedido_firebase_teste.py
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


def criar_usuario_firebase_compativel():
    """Criar usuário compatível com Firebase Auth"""
    
    # Email de teste que pode ser usado no Firebase
    email = 'demo@chiva.com'
    
    # UID simulado do Firebase (normalmente seria gerado pelo Firebase)
    firebase_uid = f"firebase_demo_{int(datetime.now().timestamp())}"
    
    # Criar/obter usuário Django que simula um usuário do Firebase
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': firebase_uid,  # Usar UID como username
            'first_name': 'Demo',
            'last_name': 'Cliente'
        }
    )
    
    return user, created


def criar_pedido_firebase_teste():
    """Criar um pedido de teste compatível com Firebase"""
    print("🔥 Criando pedido de teste compatível com Firebase...")
    
    # 1. Criar/obter usuário Firebase-compatível
    user, created = criar_usuario_firebase_compativel()
    print(f"👤 Usuário: {user.email} {'(criado)' if created else '(existente)'}")
    
    # 2. Limpar dados anteriores
    Cart.objects.filter(user=user, status='active').delete()
    
    # 3. Criar carrinho
    cart = Cart.objects.create(user=user, status='active')
    
    # 4. Adicionar produtos
    produtos = Product.objects.filter(status='active')[:3]
    if not produtos.exists():
        print("❌ Nenhum produto ativo encontrado! Execute primeiro os dados de exemplo.")
        return None
    
    total_items = 0
    
    for i, produto in enumerate(produtos, 1):
        cor = produto.colors.filter(is_active=True).first()
        quantidade = i
        
        CartItem.objects.create(
            cart=cart,
            product=produto,
            color=cor,
            quantity=quantidade,
            price=produto.price
        )
        
        total_items += quantidade
        color_info = f" ({cor.name})" if cor else ""
        print(f"📦 Adicionado: {produto.name}{color_info} x{quantidade} - {produto.price * quantidade} MZN")
    
    # 5. Calcular totais
    cart.calculate_totals()
    
    # 6. Criar pedido
    endereco = {
        'name': f'{user.first_name} {user.last_name}',
        'phone': '+258 84 123 4567',
        'email': user.email,
        'address': 'Avenida Firebase Demo, 123',
        'city': 'Maputo',
        'province': 'Maputo',
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
        customer_notes='Pedido de teste Firebase - criado automaticamente'
    )
    
    # 7. Criar pagamento simulado
    payment = Payment.objects.create(
        order=order,
        method='emola',
        amount=order.total_amount + order.shipping_cost,
        currency='MZN',
        paysuite_reference=f'FIREBASE_DEMO_{order.id}_{int(datetime.now().timestamp())}',
        status='completed',
        raw_response=json.dumps({
            'status': 'completed',
            'message': 'Pagamento Firebase demo aprovado automaticamente',
            'demo_mode': True,
            'firebase_compatible': True,
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
    print("\n" + "="*60)
    print("✅ PEDIDO FIREBASE-COMPATÍVEL CRIADO COM SUCESSO!")
    print("="*60)
    print(f"🔢 Número do Pedido: #{order.order_number}")
    print(f"🔥 Usuário Firebase: {user.email}")
    print(f"🆔 Username/UID: {user.username}")
    print(f"📦 Itens: {total_items}")
    print(f"💰 Subtotal: {cart.subtotal} MZN")
    print(f"🚚 Frete: {order.shipping_cost} MZN")
    print(f"💳 Total: {order.total_amount + order.shipping_cost} MZN")
    print(f"📊 Status: {order.get_status_display()}")
    print(f"💳 Pagamento: {payment.paysuite_reference}")
    
    print("\n🔥 INSTRUCOES PARA TESTE NO FRONTEND:")
    print("="*60)
    print(f"1. Email para login Firebase: {user.email}")
    print("2. Criar conta no Firebase com este email")
    print("3. Fazer login no frontend")
    print("4. Acessar: http://localhost:5173/account/orders")
    print(f"5. Procurar pedido: #{order.order_number}")
    
    print("\n💡 ALTERNATIVA - Teste direto da API:")
    print("="*60)
    print("1. Abrir DevTools no navegador")
    print("2. Console → Executar:")
    print(f"   fetch('/api/cart/orders/', {{")
    print(f"     headers: {{ 'Authorization': 'Bearer YOUR_FIREBASE_TOKEN' }}")
    print(f"   }}).then(r => r.json()).then(console.log)")
    
    print("="*60)
    
    return order


def criar_multiplos_pedidos_firebase(quantidade=3):
    """Criar múltiplos pedidos de teste Firebase"""
    print(f"🔥 Criando {quantidade} pedidos de teste Firebase...")
    
    pedidos = []
    for i in range(quantidade):
        print(f"\n--- Pedido Firebase {i+1}/{quantidade} ---")
        try:
            pedido = criar_pedido_firebase_teste()
            if pedido:
                pedidos.append(pedido)
        except Exception as e:
            print(f"❌ Erro ao criar pedido {i+1}: {e}")
    
    print(f"\n🎉 Criados {len(pedidos)} pedidos Firebase com sucesso!")
    return pedidos


def testar_api_diretamente():
    """Testar a API de pedidos diretamente"""
    print("🧪 Testando API de pedidos diretamente...")
    
    from django.test import Client
    from django.contrib.auth.models import User
    
    client = Client()
    
    # Encontrar usuário demo
    user = User.objects.filter(email='demo@chiva.com').first()
    if not user:
        print("❌ Usuário demo não encontrado. Execute o script primeiro.")
        return
    
    # Simular login
    client.force_login(user)
    
    # Testar API
    response = client.get('/api/cart/orders/')
    print(f"📡 Status da API: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"📦 Pedidos encontrados: {len(data.get('orders', []))}")
        for order in data.get('orders', [])[:3]:
            print(f"  - #{order.get('order_number')} - {order.get('status')}")
    else:
        print(f"❌ Erro na API: {response.content}")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Criar pedidos de teste Firebase')
    parser.add_argument('--quantidade', '-q', type=int, default=1, 
                       help='Quantidade de pedidos para criar (padrão: 1)')
    parser.add_argument('--test-api', action='store_true',
                       help='Testar API diretamente')
    
    args = parser.parse_args()
    
    try:
        if args.test_api:
            testar_api_diretamente()
        elif args.quantidade == 1:
            criar_pedido_firebase_teste()
        else:
            criar_multiplos_pedidos_firebase(args.quantidade)
    except KeyboardInterrupt:
        print("\n⏹️ Operação cancelada pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()