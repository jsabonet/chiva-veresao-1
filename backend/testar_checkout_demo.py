#!/usr/bin/env python
"""
Testar se novos pedidos estão sendo criados via checkout demo
"""

import os
import sys
import django

# Configurar Django
sys.path.append('/d/Projectos/versao_1_chiva/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

import json
import requests
import time
from django.contrib.auth.models import User
from cart.models import Cart, Order
from products.models import Product

def criar_token_para_usuario(username, email=""):
    """Criar token JWT para um usuário"""
    import base64
    
    header = {"alg": "RS256", "typ": "JWT"}
    current_time = int(time.time())
    payload = {
        "sub": username,
        "uid": username,  
        "user_id": username,
        "email": email,
        "iat": current_time - 3600,
        "exp": current_time + 3600
    }
    
    def base64url_encode(data):
        json_str = json.dumps(data, separators=(',', ':'))
        encoded = base64.urlsafe_b64encode(json_str.encode('utf-8'))
        return encoded.decode('utf-8').rstrip('=')
    
    header_encoded = base64url_encode(header)
    payload_encoded = base64url_encode(payload)
    return f"{header_encoded}.{payload_encoded}.fake_signature"

def testar_criacao_carrinho():
    """Testar criação de carrinho e adição de produtos"""
    
    print("🛒 TESTE: CRIAÇÃO DE CARRINHO E PEDIDO")
    print("=" * 60)
    
    # Usuário de teste
    test_user_id = "demo-checkout-test-2025"
    test_email = "demo-checkout@test.com"
    
    # Verificar/criar usuário
    try:
        user = User.objects.get(username=test_user_id)
        print(f"✅ Usuário existente: {user.email}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=test_user_id,
            email=test_email,
            password="test123"
        )
        print(f"✅ Usuário criado: {user.email}")
    
    # Contar pedidos antes
    orders_before = Order.objects.filter(user=user).count()
    print(f"📦 Pedidos antes: {orders_before}")
    
    # Criar token
    token = criar_token_para_usuario(test_user_id, test_email)
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # 1. Limpar carrinho existente
    print(f"\n🧹 Limpando carrinho...")
    try:
        response = requests.delete('http://localhost:8000/api/cart/', headers=headers)
        print(f"   Status: {response.status_code}")
    except Exception as e:
        print(f"   Erro: {e}")
    
    # 2. Adicionar produto ao carrinho
    print(f"\n🛍️  Adicionando produto ao carrinho...")
    
    # Pegar um produto disponível
    try:
        product = Product.objects.filter(status='active').first()
        if not product:
            print("   ❌ Nenhum produto disponível")
            return
        
        print(f"   Produto: {product.name} - ${product.price}")
        
        add_data = {
            "product_id": product.id,
            "quantity": 1
        }
        
        response = requests.post('http://localhost:8000/api/cart/', json=add_data, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            cart_data = response.json()
            print(f"   ✅ Produto adicionado! Total: ${cart_data.get('total', 'N/A')}")
        else:
            print(f"   ❌ Erro: {response.text}")
            return
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return
    
    # 3. Iniciar pagamento (criar pedido)
    print(f"\n💳 Iniciando pagamento...")
    
    payment_data = {
        "method": "demo",
        "amount": str(product.price),
        "shipping_address": {
            "street": "Rua do Teste, 123",
            "city": "Maputo",
            "country": "Moçambique",
            "phone": "+258 84 123 4567"
        },
        "billing_address": {}
    }
    
    try:
        response = requests.post('http://localhost:8000/api/cart/payments/initiate/', json=payment_data, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            payment_response = response.json()
            print(f"   ✅ Pagamento iniciado!")
            print(f"   Order ID: {payment_response.get('order_id', 'N/A')}")
            print(f"   Checkout URL: {payment_response.get('checkout_url', 'N/A')}")
            
            # Verificar se pedido foi criado
            orders_after = Order.objects.filter(user=user).count()
            print(f"\n📦 Pedidos depois: {orders_after}")
            
            if orders_after > orders_before:
                print(f"   ✅ Novo pedido criado! (+{orders_after - orders_before})")
                
                # Mostrar último pedido
                last_order = Order.objects.filter(user=user).last()
                print(f"   Último pedido: #{last_order.order_number} - ${last_order.total_amount} - {last_order.status}")
            else:
                print(f"   ⚠️  Nenhum pedido novo criado")
        else:
            print(f"   ❌ Erro no pagamento: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")

def verificar_endpoint_pagamento():
    """Verificar se o endpoint de pagamento está funcionando"""
    
    print(f"\n🔍 VERIFICAÇÃO DO ENDPOINT DE PAGAMENTO")
    print("=" * 50)
    
    # Teste sem autenticação
    try:
        response = requests.post('http://localhost:8000/api/cart/payments/initiate/', json={})
        print(f"📡 Sem auth - Status: {response.status_code}")
        print(f"   Resposta: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")

def listar_usuarios_recentes():
    """Listar usuários criados recentemente"""
    
    print(f"\n👥 USUÁRIOS RECENTES")
    print("=" * 30)
    
    recent_users = User.objects.order_by('-date_joined')[:10]
    
    for user in recent_users:
        order_count = Order.objects.filter(user=user).count()
        print(f"   {user.username} ({user.email}) - {order_count} pedidos - {user.date_joined}")

if __name__ == '__main__':
    verificar_endpoint_pagamento()
    testar_criacao_carrinho()
    listar_usuarios_recentes()