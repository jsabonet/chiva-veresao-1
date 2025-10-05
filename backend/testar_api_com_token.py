#!/usr/bin/env python
"""
Criar token JWT falso para testar API de pedidos
"""

import json
import base64
import requests

def criar_token_jwt_falso(usuario_email="demo@chiva.com", usuario_uid="demo_firebase_uid"):
    """Criar token JWT falso para desenvolvimento"""
    
    # Header do JWT (não precisa ser assinado no modo dev)
    header = {
        "alg": "RS256",
        "typ": "JWT"
    }
    
    # Payload com dados do usuário
    payload = {
        "sub": usuario_uid,  # Firebase UID
        "uid": usuario_uid,  # Firebase UID alternativo
        "email": usuario_email,
        "name": "Demo User",
        "iss": "https://securetoken.google.com/chiva-version-1",
        "aud": "chiva-version-1",
        "auth_time": 1700000000,
        "user_id": usuario_uid,
        "firebase": {
            "identities": {
                "email": [usuario_email]
            },
            "sign_in_provider": "password"
        },
        "iat": 1700000000,
        "exp": 1800000000  # Expira em um futuro distante
    }
    
    # Codificar em base64 (sem assinatura para teste)
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    signature_b64 = "fake_signature_for_dev_mode"
    
    # Montar token JWT
    token = f"{header_b64}.{payload_b64}.{signature_b64}"
    
    return token

def testar_api_com_token():
    """Testar API de pedidos com token falso"""
    
    print("🧪 Testando API de pedidos com token Firebase falso...")
    
    # Criar token falso
    token = criar_token_jwt_falso()
    print(f"🔑 Token criado (primeiros 50 chars): {token[:50]}...")
    
    # Headers com autenticação
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    # URL da API
    url = "http://127.0.0.1:8000/api/cart/orders/"
    
    try:
        # Fazer requisição GET
        response = requests.get(url, headers=headers)
        
        print(f"📡 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sucesso! Resposta da API:")
            print(f"   📦 Pedidos encontrados: {len(data.get('orders', []))}")
            
            for order in data.get('orders', [])[:5]:
                print(f"     - #{order.get('order_number')} - {order.get('status')} - {order.get('total')}")
                
        elif response.status_code == 401:
            print("❌ Ainda não autorizado:")
            print(f"   Resposta: {response.text}")
        elif response.status_code == 403:
            print("❌ Acesso negado:")
            print(f"   Resposta: {response.text}")
        else:
            print(f"❌ Erro na API:")
            print(f"   Código: {response.status_code}")
            print(f"   Resposta: {response.text[:500]}...")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro de conexão - servidor Django não está rodando?")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

if __name__ == '__main__':
    testar_api_com_token()