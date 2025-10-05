#!/usr/bin/env python
"""
Testar API com logs detalhados de autenticação
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
import time

def criar_token_jwt_valido(user_id, email=""):
    """Criar um token JWT fake bem estruturado"""
    
    # Header padrão JWT
    header = {
        "alg": "RS256",
        "typ": "JWT",
        "kid": "fake-key-id"
    }
    
    # Payload com todos os campos que o Firebase normalmente usa
    current_time = int(time.time())
    payload = {
        "iss": "https://securetoken.google.com/chiva-version-1",
        "aud": "chiva-version-1",
        "auth_time": current_time - 3600,
        "user_id": user_id,
        "sub": user_id,
        "uid": user_id,
        "iat": current_time - 3600,
        "exp": current_time + 3600,
        "email": email,
        "email_verified": True,
        "firebase": {
            "identities": {
                "email": [email]
            },
            "sign_in_provider": "password"
        }
    }
    
    # Encoding Base64URL (sem padding)
    def base64url_encode(data):
        json_str = json.dumps(data, separators=(',', ':'))
        encoded = base64.urlsafe_b64encode(json_str.encode('utf-8'))
        return encoded.decode('utf-8').rstrip('=')
    
    header_encoded = base64url_encode(header)
    payload_encoded = base64url_encode(payload)
    
    # Assinatura fake (em bypass mode não importa)
    signature = "fake_signature_for_testing"
    
    token = f"{header_encoded}.{payload_encoded}.{signature}"
    
    print(f"🔐 TOKEN CRIADO:")
    print(f"   User ID: {user_id}")
    print(f"   Email: {email}")
    print(f"   Token length: {len(token)} chars")
    print(f"   Header: {header}")
    print(f"   Payload UID: {payload['uid']}")
    
    return token

def testar_api_com_logs():
    """Testar API e capturar todos os logs"""
    
    print("🧪 TESTE DA API COM LOGS DETALHADOS")
    print("=" * 60)
    
    # Dados do usuário Firebase
    firebase_uid = "7nPO6sQas5hwJJScdSry81Kz36E2"
    email = "jsabonete09@gmail.com"
    
    # Verificar usuário no banco
    try:
        user = User.objects.get(username=firebase_uid)
        print(f"✅ Usuário encontrado: {user.email} (ID: {user.id})")
        order_count = user.order_set.count()
        print(f"✅ Pedidos no banco: {order_count}")
    except User.DoesNotExist:
        print("❌ Usuário não encontrado!")
        return
    
    # Criar token
    token = criar_token_jwt_valido(firebase_uid, email)
    
    # Headers da requisição
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'X-Debug': 'true'  # Header custom para debug
    }
    
    print(f"\n🌐 FAZENDO REQUISIÇÃO...")
    print(f"   URL: http://localhost:8000/api/cart/orders/")
    print(f"   Headers: Authorization (Bearer + {len(token)} chars)")
    
    try:
        # Fazer requisição
        response = requests.get(
            'http://localhost:8000/api/cart/orders/', 
            headers=headers,
            timeout=10
        )
        
        print(f"\n📊 RESPOSTA:")
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    print(f"   ✅ Dados recebidos: {len(data)} pedidos")
                    if data:
                        print(f"   📦 Primeiro pedido: #{data[0].get('order_number')} - ${data[0].get('total_amount')}")
                    else:
                        print(f"   ⚠️  Lista vazia!")
                elif isinstance(data, dict):
                    count = data.get('count', 0)
                    results = data.get('results', [])
                    print(f"   ✅ Paginação: {count} total, {len(results)} na página")
                else:
                    print(f"   ⚠️  Formato inesperado: {type(data)}")
                    
            except json.JSONDecodeError:
                print(f"   ❌ Resposta não é JSON válido: {response.text[:200]}")
        else:
            print(f"   ❌ Erro: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("   ❌ Servidor não está rodando!")
    except requests.exceptions.Timeout:
        print("   ❌ Timeout na requisição!")
    except Exception as e:
        print(f"   ❌ Erro inesperado: {e}")

def testar_endpoint_direto():
    """Testar usando Django diretamente sem HTTP"""
    
    print(f"\n🔧 TESTE DIRETO (SEM HTTP)")
    print("=" * 40)
    
    from cart.order_views import user_orders
    from django.http import HttpRequest
    from django.test import RequestFactory
    
    firebase_uid = "7nPO6sQas5hwJJScdSry81Kz36E2"
    
    try:
        user = User.objects.get(username=firebase_uid)
        
        # Criar request fake
        factory = RequestFactory()
        request = factory.get('/api/cart/orders/')
        request.user = user
        
        # Chamar view diretamente
        response = user_orders(request)
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.data
            print(f"   ✅ Resposta direta: {len(data)} pedidos")
            if data:
                print(f"   📦 Primeiro: #{data[0]['order_number']}")
        else:
            print(f"   ❌ Erro na view: {response.data}")
            
    except Exception as e:
        print(f"   ❌ Erro no teste direto: {e}")

if __name__ == '__main__':
    testar_api_com_logs()
    testar_endpoint_direto()