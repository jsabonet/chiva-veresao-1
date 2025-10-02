#!/usr/bin/env python3
"""
Script para testar pagamentos e ver logs do PaySuite
"""
import requests
import json

def test_payment():
    url = "http://127.0.0.1:8000/api/cart/payments/initiate/"
    headers = {
        "Authorization": "Bearer fake.eyJzdWIiOiJ0ZXN0LXVpZCJ9.fake",
        "Content-Type": "application/json"
    }
    data = {
        "method": "mpesa",
        "phone": "258840000000"
    }
    
    print("🔄 Fazendo chamada de pagamento...")
    print(f"URL: {url}")
    print(f"Headers: {headers}")
    print(f"Data: {json.dumps(data, indent=2)}")
    print("-" * 50)
    
    try:
        response = requests.post(url, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            response_data = response.json()
            print("\n✅ Resposta do Backend:")
            print(json.dumps(response_data, indent=2))
        else:
            print(f"\n❌ Erro: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

if __name__ == "__main__":
    test_payment()