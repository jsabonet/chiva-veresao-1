#!/usr/bin/env python
"""
Testar especificamente a autenticação com tokens fake
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
import requests
from django.contrib.auth.models import User

def criar_token_fake_correto(user_id, email=""):
    """Criar um token JWT fake com estrutura correta"""
    
    # Header
    header = {
        "alg": "RS256",
        "typ": "JWT"
    }
    
    # Payload
    payload = {
        "sub": user_id,  # Subject (Firebase UID)
        "uid": user_id,  # Firebase UID
        "email": email,
        "iat": 1696291200,  # Issued at (timestamp)
        "exp": 1696377600   # Expires (timestamp)
    }
    
    # Converter para base64
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    
    # Assinatura fake (não importa no modo bypass)
    signature = "fake-signature"
    
    # Montar token
    token = f"{header_b64}.{payload_b64}.{signature}"
    
    print(f"🔐 Token criado para {user_id}:")
    print(f"   Header: {header}")
    print(f"   Payload: {payload}")
    print(f"   Token (primeiros 50 chars): {token[:50]}...")
    
    return token

def testar_autenticacao_detalhada():
    """Testar autenticação com diferentes cenários"""
    
    print("🧪 TESTE DETALHADO DE AUTENTICAÇÃO")
    print("=" * 60)
    
    # Cenários de teste
    test_cases = [
        {
            "name": "Usuário Firebase Real",
            "user_id": "7nPO6sQas5hwJJScdSry81Kz36E2",
            "email": "jsabonete09@gmail.com"
        },
        {
            "name": "Demo User",
            "user_id": "demo_user_123",
            "email": "demo@chiva.com"
        }
    ]
    
    for test_case in test_cases:
        print(f"\n📋 Testando: {test_case['name']}")
        print("-" * 40)
        
        # Verificar se usuário existe no banco
        try:
            user = User.objects.get(username=test_case['user_id'])
            print(f"   ✅ Usuário existe: {user.email}")
            has_orders = user.order_set.count()
            print(f"   📦 Pedidos: {has_orders}")
        except User.DoesNotExist:
            print(f"   ❌ Usuário não existe no banco")
            continue
        
        # Criar token
        token = criar_token_fake_correto(test_case['user_id'], test_case['email'])
        
        # Testar API
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        try:
            print(f"\n   🌐 Testando API...")
            response = requests.get('http://localhost:8000/api/cart/orders/', headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else data.get('count', 0)
                print(f"   ✅ Sucesso! Pedidos: {count}")
                
                if isinstance(data, list) and data:
                    for order in data[:3]:  # Mostrar primeiros 3
                        print(f"      - #{order.get('order_number')} - ${order.get('total_amount')} - {order.get('status')}")
            else:
                print(f"   ❌ Erro: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("   ⚠️  Servidor não está rodando")
        except Exception as e:
            print(f"   ❌ Erro na requisição: {e}")

def verificar_servidor_rodando():
    """Verificar se o servidor Django está rodando"""
    
    print("\n🔍 VERIFICANDO SERVIDOR")
    print("=" * 30)
    
    try:
        response = requests.get('http://localhost:8000/', timeout=5)
        print(f"✅ Servidor respondendo: Status {response.status_code}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Servidor não está rodando")
        print("   Execute: python manage.py runserver")
        return False
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return False

if __name__ == '__main__':
    if verificar_servidor_rodando():
        testar_autenticacao_detalhada()
    else:
        print("\n⚠️  Inicie o servidor Django primeiro!")
        print("   cd backend && python manage.py runserver")