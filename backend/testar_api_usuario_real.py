#!/usr/bin/env python
"""
Testar API para o usuário real do frontend
"""

import json
import base64
import requests

def criar_token_para_usuario_real():
    """Criar token JWT para o usuário real"""
    
    # Header do JWT
    header = {
        "alg": "RS256",
        "typ": "JWT"
    }
    
    # Payload com dados do usuário real (do log)
    payload = {
        "sub": "7nPO6sQas5hwJJScdSry81Kz36E2",
        "uid": "7nPO6sQas5hwJJScdSry81Kz36E2",
        "email": "jsabonete09@gmail.com",
        "name": "Usuário Frontend",
        "iss": "https://securetoken.google.com/chiva-version-1",
        "aud": "chiva-version-1",
        "auth_time": 1700000000,
        "user_id": "7nPO6sQas5hwJJScdSry81Kz36E2",
        "firebase": {
            "identities": {
                "email": ["jsabonete09@gmail.com"]
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

def testar_api_usuario_real():
    """Testar API de pedidos para usuário real"""
    
    print("🧪 Testando API para usuário real do frontend...")
    
    # Criar token para usuário real
    token = criar_token_para_usuario_real()
    print(f"🔑 Token para usuário real criado")
    
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
            
            # Mostrar detalhes de cada pedido
            for order in data.get('orders', [])[:10]:  # Mostrar até 10 pedidos
                print(f"     - #{order.get('order_number')} - {order.get('status')} - ${order.get('total_amount')}")
                print(f"       Criado: {order.get('created_at', 'N/A')}")
                
            # Mostrar informações de paginação
            pagination = data.get('pagination', {})
            if pagination:
                print(f"   📄 Paginação:")
                print(f"     Página: {pagination.get('page')}/{pagination.get('total')//pagination.get('page_size', 1) + 1}")
                print(f"     Total: {pagination.get('total')} pedidos")
                
        elif response.status_code == 401:
            print("❌ Não autorizado:")
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
    testar_api_usuario_real()