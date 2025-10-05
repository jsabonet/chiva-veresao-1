#!/usr/bin/env python3
"""
Script de Teste PaySuite - Simulação Segura de Compras
Permite testar o fluxo de pagamento sem valores reais.
"""

import os
import sys
import requests
import json
from datetime import datetime
from decimal import Decimal

# Configuração base
BASE_URL = "http://127.0.0.1:8000/api"
TEST_USER_TOKEN = "Bearer fake.eyJzdWIiOiJ0ZXN0LXVzZXIifQ==.fake"

class PaySuiteTestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': TEST_USER_TOKEN,
            'Content-Type': 'application/json'
        })
        self.test_results = []

    def log(self, message, success=True):
        """Log de teste com timestamp"""
        status = "✅" if success else "❌"
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_msg = f"[{timestamp}] {status} {message}"
        print(log_msg)
        self.test_results.append({
            'timestamp': timestamp,
            'message': message,
            'success': success
        })

    def safe_request(self, method, url, **kwargs):
        """Fazer request com tratamento de erro"""
        try:
            response = self.session.request(method, url, **kwargs)
            return response, None
        except Exception as e:
            return None, str(e)

    def test_1_clear_cart(self):
        """Teste 1: Limpar carrinho anterior"""
        self.log("🧹 Limpando carrinho de teste...")
        
        url = f"{BASE_URL}/cart/debug/clear-carts/"
        data = {"username": "test-user"}
        
        response, error = self.safe_request('POST', url, json=data)
        
        if error:
            self.log(f"Erro ao limpar carrinho: {error}", False)
            return False
            
        if response and response.status_code == 200:
            result = response.json()
            self.log(f"Carrinho limpo: {result.get('carts_cleared', 0)} carrinhos removidos")
            return True
        else:
            self.log(f"Falha ao limpar carrinho: {response.status_code if response else 'No response'}", False)
            return False

    def test_2_add_product(self, product_id=33, price_limit=50.0):
        """Teste 2: Adicionar produto com preço limitado"""
        self.log(f"🛒 Adicionando produto {product_id} ao carrinho...")
        
        url = f"{BASE_URL}/cart/debug/add-item/"
        data = {
            "username": "test-user",
            "product_id": product_id
        }
        
        response, error = self.safe_request('POST', url, json=data)
        
        if error:
            self.log(f"Erro ao adicionar produto: {error}", False)
            return False, 0
            
        if response and response.status_code == 200:
            result = response.json()
            total = float(result.get('total', 0))
            
            if total > price_limit:
                self.log(f"⚠️ Preço muito alto ({total}), definindo preço seguro...", False)
                return self.set_safe_prices()
            else:
                self.log(f"Produto adicionado: Total {total} MZN")
                return True, total
        else:
            self.log(f"Falha ao adicionar produto: {response.status_code if response else 'No response'}", False)
            return False, 0

    def set_safe_prices(self, safe_price=5.99):
        """Definir preços seguros para teste"""
        self.log(f"💰 Definindo preço seguro: {safe_price} MZN...")
        
        url = f"{BASE_URL}/cart/debug/set-low-prices/"
        data = {"price": safe_price}
        
        response, error = self.safe_request('POST', url, json=data)
        
        if response and response.status_code == 200:
            result = response.json()
            self.log(f"Preços atualizados: {result.get('updated_count', 0)} produtos")
            
            # Recriar carrinho com novo preço
            self.test_1_clear_cart()
            return self.test_2_add_product(price_limit=50)
        else:
            self.log("Falha ao definir preços seguros", False)
            return False, 0

    def test_3_initiate_payment(self, total, shipping=2.5):
        """Teste 3: Iniciar pagamento com valor seguro"""
        final_total = total + shipping
        
        if final_total > 50:
            self.log(f"⚠️ Total muito alto ({final_total}), reduzindo para teste...", False)
            final_total = 9.99
            shipping = 2.5
            total = final_total - shipping
        
        self.log(f"💳 Iniciando pagamento: {final_total} MZN (produto: {total} + envio: {shipping})")
        
        url = f"{BASE_URL}/cart/payments/initiate/"
        data = {
            "method": "emola",
            "phone": "851234567",  # Número de teste
            "amount": final_total,
            "shipping_amount": shipping,
            "currency": "MZN"
        }
        
        response, error = self.safe_request('POST', url, json=data)
        
        if error:
            self.log(f"Erro ao iniciar pagamento: {error}", False)
            return False, None
            
        if response and response.status_code == 200:
            result = response.json()
            order_id = result.get('order_id')
            payment_info = result.get('payment', {})
            
            self.log(f"Pagamento iniciado: Pedido #{order_id}")
            self.log(f"ID Pagamento: {payment_info.get('id', 'N/A')}")
            
            return True, order_id
        else:
            self.log(f"Falha ao iniciar pagamento: {response.status_code if response else 'No response'}", False)
            if response:
                try:
                    error_data = response.json()
                    self.log(f"Erro detalhado: {error_data.get('error', 'Unknown error')}", False)
                except:
                    self.log(f"Resposta: {response.text[:200]}", False)
            return False, None

    def test_4_simulate_webhook(self, order_id):
        """Teste 4: Simular webhook de confirmação"""
        if not order_id:
            self.log("❌ Sem order_id para simular webhook", False)
            return False
            
        self.log(f"🔔 Simulando webhook para pedido #{order_id}...")
        
        url = f"{BASE_URL}/cart/payments/webhook/"
        data = {
            "event": "payment.success",
            "data": {
                "id": f"test_payment_{order_id}",
                "reference": f"ORD{order_id:06d}",
                "amount": 7.49,
                "status": "completed"
            },
            "metadata": {
                "order_id": order_id,
                "cart_id": 1,
                "user": "test-user"
            }
        }
        
        # Remover autorização para webhook (vem externamente)
        headers = {'Content-Type': 'application/json'}
        response, error = self.safe_request('POST', url, json=data, headers=headers)
        
        if response and response.status_code == 200:
            self.log("Webhook simulado com sucesso")
            return True
        else:
            self.log(f"Falha no webhook: {response.status_code if response else 'No response'}", False)
            return False

    def test_5_check_status(self, order_id):
        """Teste 5: Verificar status do pagamento"""
        if not order_id:
            self.log("❌ Sem order_id para verificar status", False)
            return False
            
        self.log(f"📋 Verificando status do pedido #{order_id}...")
        
        url = f"{BASE_URL}/cart/payments/status/{order_id}/"
        response, error = self.safe_request('GET', url)
        
        if response and response.status_code == 200:
            result = response.json()
            order = result.get('order', {})
            payments = result.get('payments', [])
            
            self.log(f"Status do pedido: {order.get('status', 'Unknown')}")
            self.log(f"Total de pagamentos: {len(payments)}")
            
            for payment in payments:
                self.log(f"  - Pagamento {payment.get('method', 'N/A')}: {payment.get('status', 'N/A')}")
            
            return True
        else:
            self.log(f"Falha ao verificar status: {response.status_code if response else 'No response'}", False)
            return False

    def run_complete_test(self):
        """Executar teste completo de ponta a ponta"""
        print("🚀 Iniciando Teste Completo PaySuite")
        print("=" * 50)
        
        # Teste 1: Limpar ambiente
        if not self.test_1_clear_cart():
            return False
            
        # Teste 2: Adicionar produto
        success, total = self.test_2_add_product()
        if not success:
            return False
            
        # Teste 3: Iniciar pagamento
        success, order_id = self.test_3_initiate_payment(total)
        if not success:
            return False
            
        # Teste 4: Simular webhook
        self.test_4_simulate_webhook(order_id)
        
        # Teste 5: Verificar status
        self.test_5_check_status(order_id)
        
        print("\n" + "=" * 50)
        self.log("✅ Teste completo finalizado!")
        
        # Resumo
        successful_tests = sum(1 for result in self.test_results if result['success'])
        total_tests = len(self.test_results)
        
        print(f"\n📊 Resumo: {successful_tests}/{total_tests} testes bem-sucedidos")
        
        return successful_tests == total_tests

    def save_results(self, filename="test_results.json"):
        """Salvar resultados do teste"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'results': self.test_results,
                'summary': {
                    'total_tests': len(self.test_results),
                    'successful_tests': sum(1 for r in self.test_results if r['success']),
                    'failed_tests': sum(1 for r in self.test_results if not r['success'])
                }
            }, f, indent=2, ensure_ascii=False)
        
        print(f"📄 Resultados salvos em: {filename}")


def main():
    """Função principal"""
    if len(sys.argv) > 1 and sys.argv[1] == '--help':
        print("""
Uso: python test_paysuite_safe.py [opções]

Opções:
  --help          Mostrar esta ajuda
  --quick         Teste rápido (apenas verificações básicas)
  --full          Teste completo (padrão)
  --webhook-only  Apenas simular webhook
        """)
        return
    
    # Verificar se servidor está rodando
    try:
        response = requests.get(f"{BASE_URL}/products/", timeout=5)
        if response.status_code != 200:
            print("❌ Servidor Django não está respondendo corretamente")
            print("   Certifique-se de que o servidor está rodando: python manage.py runserver")
            return
    except requests.exceptions.RequestException:
        print("❌ Não foi possível conectar ao servidor Django")
        print("   Certifique-se de que o servidor está rodando em http://127.0.0.1:8000")
        return
    
    # Executar teste
    tester = PaySuiteTestRunner()
    
    try:
        success = tester.run_complete_test()
        tester.save_results()
        
        if success:
            print("\n🎉 Todos os testes passaram! Sistema pronto para uso.")
        else:
            print("\n⚠️ Alguns testes falharam. Verifique os logs acima.")
            
    except KeyboardInterrupt:
        print("\n\n⏹️ Teste interrompido pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")


if __name__ == "__main__":
    main()