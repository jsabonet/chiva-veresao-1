#!/usr/bin/env python3
"""
Teste específico para a API de itens do pedido
"""
import requests
import json

def test_order_items():
    """Testa a API de itens do pedido"""
    BASE_URL = "http://localhost:8000"
    
    try:
        # Primeiro, vamos listar os pedidos para pegar um ID válido
        response = requests.get(f"{BASE_URL}/api/cart/orders/")
        print(f"Status da listagem de pedidos: {response.status_code}")
        
        if response.status_code == 403:
            print("❌ Erro de autenticação - precisamos estar logados como admin")
            print("Este teste requer autenticação. Execute os testes através do frontend.")
            return
        
        if response.status_code == 200:
            data = response.json()
            if data.get('orders') and len(data['orders']) > 0:
                order_id = data['orders'][0]['id']
                print(f"✅ Testando com pedido ID: {order_id}")
                
                # Teste da API de itens
                items_response = requests.get(f"{BASE_URL}/api/cart/orders/{order_id}/items/")
                print(f"Status da API de itens: {items_response.status_code}")
                print(f"Resposta: {items_response.text[:200]}...")
                
                if items_response.status_code == 500:
                    print("❌ Erro 500 - Verificar logs do Django")
                elif items_response.status_code == 403:
                    print("⚠️  Erro 403 - Autenticação necessária (esperado)")
                else:
                    print("✅ API respondeu sem erro 500")
            else:
                print("❌ Nenhum pedido encontrado para testar")
        else:
            print(f"❌ Erro ao buscar pedidos: {response.status_code}")
            print(response.text)
    
    except requests.exceptions.ConnectionError:
        print("❌ Erro: Django não está rodando em http://localhost:8000")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")

if __name__ == "__main__":
    print("🧪 Testando API de Itens do Pedido")
    print("=" * 40)
    test_order_items()