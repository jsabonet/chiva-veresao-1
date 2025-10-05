#!/usr/bin/env python
"""
Testar checkout com produto de valor alto (similar ao laptop de $234)
"""

import os
import sys
import django
from pathlib import Path

# Carregar .env antes de configurar Django
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Configurar Django
sys.path.append('/d/Projectos/versao_1_chiva/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

import json
import base64
import time
import requests
from django.contrib.auth.models import User
from products.models import Product

def criar_token_valido(user_id, email=""):
    """Criar token JWT válido para teste"""
    
    header = {"alg": "RS256", "typ": "JWT"}
    current_time = int(time.time())
    payload = {
        "sub": user_id,
        "uid": user_id,
        "user_id": user_id,
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

def testar_checkout_alto_valor():
    """Testar checkout com laptop de $234"""
    
    print("🛒 TESTE: CHECKOUT COM VALOR ALTO ($234)")
    print("=" * 60)
    
    # Usuário de teste
    test_user_id = "high-value-test-user"
    test_email = "highvalue@test.com"
    
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
    orders_before = user.order_set.count()
    print(f"📦 Pedidos antes: {orders_before}")
    
    # Criar token
    token = criar_token_valido(test_user_id, test_email)
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # 1. Limpar carrinho existente
    print(f"\n🧹 Limpando carrinho...")
    try:
        response = requests.delete('http://localhost:8000/api/cart/', headers=headers)
        print(f"   Status: {response.status_code}")
    except Exception as e:
        print(f"   Erro: {e}")
        return
    
    # 2. Buscar laptop original de $234
    print(f"\n🔍 Procurando laptop de $234...")
    
    laptop = Product.objects.filter(
        name__icontains='Laptop Dell Inspiron',
        price=234.00,
        status='active'
    ).first()
    
    if not laptop:
        print("   ❌ Laptop de $234 não encontrado")
        return
    
    print(f"   ✅ Produto encontrado: {laptop.name} - ${laptop.price}")
    
    # 3. Adicionar produto ao carrinho
    print(f"\n🛍️  Adicionando laptop ao carrinho...")
    
    add_data = {
        "product_id": laptop.id,
        "quantity": 1
    }
    
    try:
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
    
    # 4. Iniciar pagamento com valor alto
    print(f"\n💳 Iniciando pagamento...")
    
    payment_data = {
        "method": "demo",
        "amount": float(laptop.price),
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
            
            # Verificar se pedido foi criado
            orders_after = user.order_set.count()
            print(f"\n📦 Pedidos depois: {orders_after}")
            
            if orders_after > orders_before:
                print(f"   ✅ Novo pedido criado! (+{orders_after - orders_before})")
                
                # Mostrar último pedido
                last_order = user.order_set.last()
                print(f"   Último pedido: #{last_order.order_number} - ${last_order.total_amount} - {last_order.status}")
                return True
            else:
                print(f"   ⚠️  Nenhum pedido novo criado")
        else:
            print(f"   ❌ Erro no pagamento: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return False

if __name__ == '__main__':
    if testar_checkout_alto_valor():
        print(f"\n🎉 TESTE CONCLUÍDO COM SUCESSO!")
        print(f"✅ O checkout demo agora funciona com valores altos!")
    else:
        print(f"\n❌ TESTE FALHOU")