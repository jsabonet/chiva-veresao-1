#!/usr/bin/env python3
"""
Teste das APIs de gerenciamento de pedidos
"""
import requests
import json
import sys

# Configuração
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/cart"

def test_orders_api():
    """Testa se a API de pedidos está funcionando"""
    try:
        # Teste básico - listar pedidos
        response = requests.get(f"{API_BASE}/orders/")
        print(f"GET /api/cart/orders/ - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('orders'):
                order_id = data['orders'][0]['id']
                print(f"Primeiro pedido encontrado: ID {order_id}")
                
                # Teste items do pedido
                items_response = requests.get(f"{API_BASE}/orders/{order_id}/items/")
                print(f"GET /api/cart/orders/{order_id}/items/ - Status: {items_response.status_code}")
                
                # Teste update de status (sem autenticação, esperamos 401/403)
                status_data = {"status": "confirmed"}
                status_response = requests.patch(
                    f"{API_BASE}/orders/{order_id}/status/",
                    json=status_data,
                    headers={'Content-Type': 'application/json'}
                )
                print(f"PATCH /api/cart/orders/{order_id}/status/ - Status: {status_response.status_code}")
                
                # Teste tracking update (sem autenticação, esperamos 401/403)  
                tracking_data = {"tracking_number": "TEST123"}
                tracking_response = requests.patch(
                    f"{API_BASE}/orders/{order_id}/tracking/",
                    json=tracking_data,
                    headers={'Content-Type': 'application/json'}
                )
                print(f"PATCH /api/cart/orders/{order_id}/tracking/ - Status: {tracking_response.status_code}")
                
                # Teste notes update (sem autenticação, esperamos 401/403)
                notes_data = {"notes": "Teste de observação"}
                notes_response = requests.patch(
                    f"{API_BASE}/orders/{order_id}/notes/",
                    json=notes_data,
                    headers={'Content-Type': 'application/json'}
                )
                print(f"PATCH /api/cart/orders/{order_id}/notes/ - Status: {notes_response.status_code}")
                
            return True
        else:
            print(f"Erro ao acessar API de pedidos: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Erro: Não foi possível conectar ao servidor Django")
        print("Certifique-se de que o servidor está rodando em http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False

def main():
    print("🧪 Testando APIs de Gerenciamento de Pedidos")
    print("=" * 50)
    
    if test_orders_api():
        print("\n✅ Testes concluídos - APIs estão respondendo")
    else:
        print("\n❌ Testes falharam - Verifique o servidor")
        sys.exit(1)

if __name__ == "__main__":
    main()