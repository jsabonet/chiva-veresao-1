#!/usr/bin/env python
"""
Teste simples de checkout para verificar se problema foi resolvido
"""

import requests
import json
import time
from pathlib import Path
from dotenv import load_dotenv

# Carregar .env
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

def criar_token_teste():
    """Token de teste simples"""
    import base64
    header = {"alg": "RS256", "typ": "JWT"}
    current_time = int(time.time())
    payload = {
        "sub": "checkout-test-user",
        "uid": "checkout-test-user", 
        "email": "checkout@test.com",
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

def teste_simples():
    print("🧪 TESTE SIMPLES DE CHECKOUT")
    print("=" * 40)
    
    token = criar_token_teste()
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # 1. Testar endpoint básico primeiro
    print("1. Testando conexão com API...")
    try:
        response = requests.get('http://localhost:8000/api/categories/', headers=headers, timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ API funcionando")
        else:
            print("   ❌ API com problema")
            return False
    except Exception as e:
        print(f"   ❌ Erro de conexão: {e}")
        return False
    
    # 2. Testar payment initiate com dados mínimos
    print("\n2. Testando initiate payment...")
    
    payment_data = {
        "method": "demo",
        "amount": 25.00,
        "shipping_address": {
            "street": "Rua Teste",
            "city": "Maputo",
            "country": "Moçambique",
            "phone": "+258 84 123 4567"
        }
    }
    
    try:
        response = requests.post(
            'http://localhost:8000/api/cart/payments/initiate/', 
            json=payment_data, 
            headers=headers,
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Pagamento iniciado!")
            print(f"   Order ID: {result.get('order_id', 'N/A')}")
            return True
        else:
            print(f"   ❌ Erro: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return False

if __name__ == '__main__':
    if teste_simples():
        print(f"\n🎉 TESTE PASSOU!")
        print(f"✅ O erro client_amount foi corrigido!")
    else:
        print(f"\n❌ TESTE FALHOU")