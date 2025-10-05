#!/usr/bin/env python
"""
Teste direto da API de pedidos
"""

import requests
import json

def testar_api_pedidos():
    """Testar API de pedidos diretamente"""
    
    print("🧪 Testando API de pedidos...")
    
    # URL da API
    url = "http://127.0.0.1:8000/api/cart/orders/"
    
    # Headers básicos (sem autenticação por enquanto)
    headers = {
        'Content-Type': 'application/json',
    }
    
    try:
        # Fazer requisição GET
        response = requests.get(url, headers=headers)
        
        print(f"📡 Status: {response.status_code}")
        print(f"📄 Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Resposta da API:")
            print(f"   📦 Pedidos: {len(data.get('orders', []))}")
            for order in data.get('orders', [])[:3]:
                print(f"     - #{order.get('order_number')} - {order.get('status')}")
        elif response.status_code == 401:
            print("🔒 API requer autenticação (esperado)")
            print(f"   Resposta: {response.text[:200]}...")
        else:
            print(f"❌ Erro na API:")
            print(f"   Código: {response.status_code}")
            print(f"   Resposta: {response.text[:500]}...")
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro de conexão - servidor Django não está rodando?")
        print("   Execute: python manage.py runserver")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

if __name__ == '__main__':
    testar_api_pedidos()