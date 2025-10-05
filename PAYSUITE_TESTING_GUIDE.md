# Guia de Testes PaySuite - Simulação de Compras

## 🎯 Problema
O PaySuite processa valores reais mesmo em ambiente de desenvolvimento. Este guia mostra como testar de forma segura sem cobranças reais.

## 🏗️ Configuração do Ambiente de Teste

### 1. Variáveis de Ambiente para Teste

Adicione ao seu `.env`:

```bash
# PaySuite - Ambiente de Teste
PAYSUITE_BASE_URL=https://sandbox.paysuite.co.mz
PAYSUITE_TEST_MODE=sandbox
PAYSUITE_SANDBOX_API_KEY=your_sandbox_key_here
PAYSUITE_SANDBOX_WEBHOOK_SECRET=your_sandbox_webhook_secret

# Para desenvolvimento local
CART_CLEAR_ON_INITIATE=1
EMOLA_MAX_AMOUNT=100000
```

### 2. URLs de Ambiente

| Ambiente | URL Base |
|----------|----------|
| **Produção** | `https://api.paysuite.co.mz` |
| **Sandbox** | `https://sandbox.paysuite.co.mz` |
| **Desenvolvimento** | `https://dev-api.paysuite.co.mz` |

## 🧪 Métodos de Teste Disponíveis

### Método 1: Valores de Teste Específicos
```bash
# Valores que simulam diferentes cenários
PAYSUITE_TEST_AMOUNTS='{"success": 100, "failed": 200, "pending": 300}'
```

### Método 2: Mock Local
```bash
# Ativa mock local (não chama API real)
PAYSUITE_TEST_MODE=mock
PAYSUITE_MOCK_RESPONSES=true
```

### Método 3: Sandbox Oficial
```bash
# Usa ambiente sandbox do PaySuite
PAYSUITE_TEST_MODE=sandbox
PAYSUITE_BASE_URL=https://sandbox.paysuite.co.mz
```

## 📝 Scripts de Teste Prontos

### Teste 1: Pagamento com Valor Seguro
```bash
# No terminal backend
python manage.py shell
```

```python
from cart.payments.paysuite import PaysuiteClient
import os

# Configurar para teste
os.environ['PAYSUITE_TEST_MODE'] = 'mock'

client = PaysuiteClient()
response = client.create_payment(
    amount=1.00,  # Valor baixo para teste
    method='emola',
    reference='TEST001',
    description='Teste de pagamento',
    callback_url='http://127.0.0.1:8000/api/cart/payments/webhook/'
)
print(response)
```

### Teste 2: Simulação Completa de Compra
```bash
# PowerShell
$headers = @{"Authorization"="Bearer fake.eyJzdWIiOiJ0ZXN0LXVpZCJ9.fake"}

# 1. Adicionar produto ao carrinho
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/cart/debug/add-item/" -Headers $headers -Method POST -Body '{"username": "test-user", "product_id": 33}' -ContentType "application/json"

# 2. Iniciar pagamento com valor baixo
$body = @{ 
    method = "emola"
    amount = 1.00
    shipping_amount = 0.50
    currency = "MZN"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/cart/payments/initiate/" -Headers $headers -Method POST -Body $body -ContentType "application/json"
```

## 🛡️ Configurações de Segurança

### Limites de Teste
Adicione ao `.env`:
```bash
# Limites para ambiente de teste
MAX_TEST_AMOUNT=50.00
MIN_TEST_AMOUNT=1.00
ALLOWED_TEST_METHODS=emola,mpesa
```

### Implementação de Validação
```python
# No arquivo cart/payments/paysuite.py
def create_payment(self, *, amount, **kwargs):
    # Validação para ambiente de teste
    if os.getenv('PAYSUITE_TEST_MODE') == 'sandbox':
        max_amount = float(os.getenv('MAX_TEST_AMOUNT', '50.00'))
        if amount > max_amount:
            raise ValueError(f"Valor {amount} excede limite de teste {max_amount}")
    
    # ... resto do código
```

## 🎭 Mock Responses para Testes

### Criar Mock Client
```python
# arquivo: cart/payments/paysuite_mock.py
class MockPaysuiteClient:
    def create_payment(self, **kwargs):
        amount = kwargs.get('amount', 0)
        
        # Simular diferentes cenários baseados no valor
        if amount == 1.00:
            return {"status": "success", "data": {"id": "mock_success", "checkout_url": None}}
        elif amount == 2.00:
            return {"status": "error", "message": "Pagamento falhou"}
        else:
            return {"status": "pending", "data": {"id": "mock_pending"}}
```

## 📱 Números de Teste

### M-Pesa/e-Mola (Números que não processam cobrança real)
```bash
# Números de teste fornecidos pelo PaySuite
TEST_MPESA_NUMBERS="841234567,842345678,843456789"
TEST_EMOLA_NUMBERS="851234567,852345678,853456789"
```

## 🔄 Webhook de Teste

### Simular Webhook Localmente
```bash
# PowerShell - Simular webhook de sucesso
$body = @{
    event = "payment.success"
    data = @{
        id = "test_payment_123"
        reference = "ORD000001"
        amount = 1.50
        status = "completed"
    }
    metadata = @{
        order_id = 1
        cart_id = 1
    }
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/cart/payments/webhook/" -Method POST -Body $body -ContentType "application/json"
```

## 📊 Dashboard de Testes

### Criar Script de Monitoramento
```python
# test_payments_monitor.py
import requests
import time
from datetime import datetime

def monitor_test_payments():
    """Monitora pagamentos de teste"""
    while True:
        try:
            response = requests.get('http://127.0.0.1:8000/api/cart/debug/list-carts/')
            data = response.json()
            print(f"[{datetime.now()}] Carrinhos ativos: {data.get('active_carts', 0)}")
            time.sleep(30)
        except Exception as e:
            print(f"Erro: {e}")
            time.sleep(10)

if __name__ == "__main__":
    monitor_test_payments()
```

## 🚀 Comandos Rápidos para Teste

### Setup Rápido de Teste
```bash
# 1. Ativar modo de teste
export PAYSUITE_TEST_MODE=mock
export MAX_TEST_AMOUNT=10.00

# 2. Limpar dados anteriores
python manage.py shell -c "
from cart.models import Cart, Order, Payment
Cart.objects.filter(status='active').delete()
Order.objects.filter(status='pending').delete()
"

# 3. Executar teste completo
python test_payment_flow.py
```

### Validação de Ambiente
```bash
# Verificar configuração atual
python -c "
import os
print('PAYSUITE_BASE_URL:', os.getenv('PAYSUITE_BASE_URL'))
print('PAYSUITE_TEST_MODE:', os.getenv('PAYSUITE_TEST_MODE'))
print('MAX_TEST_AMOUNT:', os.getenv('MAX_TEST_AMOUNT'))
"
```

## ⚠️ Importante

### Antes de Produção
1. **Remover** todas as variáveis de teste do `.env`
2. **Validar** que `PAYSUITE_BASE_URL` aponta para produção
3. **Testar** com valores baixos primeiro
4. **Configurar** limites de segurança

### Monitoramento
- Sempre verificar logs do PaySuite
- Monitorar webhooks recebidos
- Validar valores processados
- Confirmar que ambiente de teste não afeta produção

## 📞 Suporte PaySuite
- Email: suporte@paysuite.co.mz
- Documentação: https://docs.paysuite.co.mz
- Sandbox: Solicitar acesso via suporte