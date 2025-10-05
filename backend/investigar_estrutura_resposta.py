#!/usr/bin/env python
"""
Investigar a estrutura exata da resposta da API
"""

import os
import sys
import django

# Configurar Django
sys.path.append('/d/Projectos/versao_1_chiva/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

import json
import base64
import time
import requests
from django.contrib.auth.models import User

def criar_token_valido():
    """Criar token JWT válido para teste"""
    
    firebase_uid = "7nPO6sQas5hwJJScdSry81Kz36E2"
    email = "jsabonete09@gmail.com"
    
    header = {"alg": "RS256", "typ": "JWT"}
    current_time = int(time.time())
    payload = {
        "sub": firebase_uid,
        "uid": firebase_uid,
        "user_id": firebase_uid,
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

def testar_estrutura_resposta():
    """Testar e analisar a estrutura completa da resposta"""
    
    print("🔍 ANÁLISE COMPLETA DA RESPOSTA DA API")
    print("=" * 60)
    
    # Verificar usuário no banco
    firebase_uid = "7nPO6sQas5hwJJScdSry81Kz36E2"
    try:
        user = User.objects.get(username=firebase_uid)
        order_count = user.order_set.count()
        print(f"✅ Usuário: {user.email} ({order_count} pedidos)")
    except User.DoesNotExist:
        print("❌ Usuário não encontrado")
        return
    
    # Criar token e fazer requisição
    token = criar_token_valido()
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get('http://localhost:8000/api/cart/orders/', headers=headers)
        
        print(f"\n📊 RESPOSTA HTTP:")
        print(f"   Status: {response.status_code}")
        print(f"   Content-Type: {response.headers.get('content-type')}")
        print(f"   Content-Length: {response.headers.get('content-length')}")
        
        if response.status_code == 200:
            # Parse JSON
            data = response.json()
            print(f"\n🔍 ESTRUTURA DOS DADOS:")
            print(f"   Tipo: {type(data)}")
            print(f"   Chaves principais: {list(data.keys()) if isinstance(data, dict) else 'Lista'}")
            
            if isinstance(data, dict):
                # Analisar cada chave
                for key, value in data.items():
                    print(f"\n   '{key}':")
                    print(f"      Tipo: {type(value)}")
                    
                    if isinstance(value, list):
                        print(f"      Tamanho: {len(value)} itens")
                        if value:
                            print(f"      Primeiro item: {type(value[0])}")
                            if isinstance(value[0], dict):
                                print(f"      Chaves do item: {list(value[0].keys())}")
                                
                                # Mostrar dados do primeiro pedido
                                first_order = value[0]
                                print(f"      📦 Primeiro pedido:")
                                print(f"         Order Number: {first_order.get('order_number')}")
                                print(f"         Total: ${first_order.get('total_amount')}")
                                print(f"         Status: {first_order.get('status')}")
                    
                    elif isinstance(value, dict):
                        print(f"      Chaves: {list(value.keys())}")
                        for subkey, subvalue in value.items():
                            print(f"         {subkey}: {subvalue}")
                    else:
                        print(f"      Valor: {value}")
            
            elif isinstance(data, list):
                print(f"   Lista com {len(data)} itens")
                if data:
                    print(f"   Primeiro item: {data[0]}")
            
            # Mostrar JSON formatado (primeiros 1000 chars)
            json_str = json.dumps(data, indent=2, ensure_ascii=False)
            print(f"\n📄 JSON COMPLETO (primeiros 500 chars):")
            print(json_str[:500])
            if len(json_str) > 500:
                print("...")
                
        else:
            print(f"❌ Erro: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Servidor não está rodando")
    except Exception as e:
        print(f"❌ Erro: {e}")

def comparar_com_teste_direto():
    """Comparar resposta HTTP com teste direto"""
    
    print(f"\n🔄 COMPARAÇÃO: HTTP vs DIRETO")
    print("=" * 40)
    
    from cart.order_views import user_orders
    from django.test import RequestFactory
    
    firebase_uid = "7nPO6sQas5hwJJScdSry81Kz36E2"
    
    try:
        user = User.objects.get(username=firebase_uid)
        
        # Teste direto
        factory = RequestFactory()
        request = factory.get('/api/cart/orders/')
        request.user = user
        
        response = user_orders(request)
        
        print(f"📋 Teste direto:")
        print(f"   Status: {response.status_code}")
        print(f"   Tipo: {type(response.data)}")
        print(f"   Chaves: {list(response.data.keys()) if isinstance(response.data, dict) else 'Lista'}")
        
        if isinstance(response.data, dict):
            orders = response.data.get('orders', [])
            pagination = response.data.get('pagination', {})
            print(f"   Orders: {len(orders)} pedidos")
            print(f"   Pagination: {pagination}")
            
            if orders:
                print(f"   Primeiro pedido: #{orders[0]['order_number']}")
        
    except Exception as e:
        print(f"   ❌ Erro: {e}")

if __name__ == '__main__':
    testar_estrutura_resposta()
    comparar_com_teste_direto()