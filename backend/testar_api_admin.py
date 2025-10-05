#!/usr/bin/env python
"""
Teste da API de administrador para listar todos os pedidos
"""

import json
import base64
import requests

def criar_token_admin():
    """Criar token JWT de administrador para desenvolvimento"""
    
    # Header do JWT
    header = {
        "alg": "RS256",
        "typ": "JWT"
    }
    
    # Payload com dados do administrador
    payload = {
        "sub": "admin_firebase_uid",
        "uid": "admin_firebase_uid",
        "email": "admin@chiva.com",
        "name": "Administrador",
        "is_admin": True,
        "admin": True,
        "iss": "https://securetoken.google.com/chiva-version-1",
        "aud": "chiva-version-1",
        "auth_time": 1700000000,
        "user_id": "admin_firebase_uid",
        "firebase": {
            "identities": {
                "email": ["admin@chiva.com"]
            },
            "sign_in_provider": "password"
        },
        "iat": 1700000000,
        "exp": 1800000000
    }
    
    # Codificar em base64
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    signature_b64 = "fake_signature_for_dev_mode"
    
    # Montar token JWT
    token = f"{header_b64}.{payload_b64}.{signature_b64}"
    
    return token

def testar_api_admin():
    """Testar API de administrador"""
    
    print("🧪 Testando API de administrador...")
    
    # Criar token de administrador
    token = criar_token_admin()
    print(f"🔑 Token de admin criado")
    
    # Headers com autenticação
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    # URLs para testar
    urls = [
        "http://127.0.0.1:8000/api/cart/admin/orders/",
        "http://127.0.0.1:8000/api/cart/orders/",  # Fallback para user orders
    ]
    
    for url in urls:
        print(f"\n📡 Testando: {url}")
        try:
            response = requests.get(url, headers=headers)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Sucesso!")
                print(f"   📦 Pedidos: {len(data.get('orders', []))}")
                
                # Mostrar alguns pedidos
                for order in data.get('orders', [])[:3]:
                    print(f"     - #{order.get('order_number')} - {order.get('status')} - ${order.get('total_amount')}")
                    
                if 'pagination' in data:
                    pagination = data['pagination']
                    print(f"   📄 Total: {pagination.get('total')} pedidos")
                
                break  # Se um URL funcionou, não precisa testar o próximo
                
            elif response.status_code == 401:
                print(f"   ❌ Não autorizado: {response.text[:100]}...")
            elif response.status_code == 403:
                print(f"   ❌ Acesso negado: {response.text[:100]}...")
            elif response.status_code == 404:
                print(f"   ❌ Endpoint não encontrado")
            else:
                print(f"   ❌ Erro {response.status_code}: {response.text[:100]}...")
                
        except requests.exceptions.ConnectionError:
            print("   ❌ Erro de conexão - servidor não está rodando?")
        except Exception as e:
            print(f"   ❌ Erro inesperado: {e}")

if __name__ == '__main__':
    testar_api_admin()