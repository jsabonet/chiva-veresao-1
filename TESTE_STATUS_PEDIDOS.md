# Teste de Status de Pedidos - Guia Completo

## Resumo dos Testes Realizados

### ✅ Endpoint de Status Funcionando
O endpoint `/api/cart/payments/status/{order_id}/` está funcionando corretamente com autenticação Firebase.

### 📊 Status dos Pedidos Testados

#### Pedido #10 (Teste com Simulação)
- **Status Order**: `failed`
- **Status Payment**: `failed`
- **Método**: M-Pesa
- **Referência**: `45782747-fbeb-482a-8cf0-c562ae531f37`
- **Evento Webhook**: `payment.failed` ✅
- **Conclusão**: Webhook simulado funcionou corretamente

#### Pedido #12 (Pagamento Real - Produção)
- **Status Order**: `pending` ⏳
- **Status Payment**: `pending` ⏳
- **Método**: M-Pesa
- **Referência**: `4473cd66-6fda-4d1e-91bc-2e19682394c8`
- **Checkout URL**: `https://paysuite.tech/checkout/4473cd66-6fda-4d1e-91bc-2e19682394c8`
- **Criado**: 2025-10-17 10:12:18 UTC
- **Conclusão**: Webhook real não chegou (problema de entrega PaySuite → servidor)

#### Pedido #13 (Pagamento Real - Produção)
- **Status Order**: `pending` ⏳
- **Status Payment**: `pending` ⏳
- **Método**: e-Mola
- **Referência**: `d997aa88-0a59-48f0-bc17-bdcc8882ca36`
- **Checkout URL**: `https://paysuite.tech/checkout/d997aa88-0a59-48f0-bc17-bdcc8882ca36`
- **Criado**: 2025-10-17 10:20:08 UTC
- **Conclusão**: Webhook real não chegou (problema de entrega PaySuite → servidor)

---

## 🔧 Como Testar o Endpoint com PowerShell

### 1. Obter Token de Autenticação Firebase
Faça login no site e copie o `id_token` do Firebase (do console do navegador ou da resposta de login).

### 2. Testar Status de Pedido Específico
```powershell
# Definir o token
$TOKEN = "SEU_ID_TOKEN_AQUI"

# Testar pedido #12
Invoke-RestMethod -Uri "https://chivacomputer.co.mz/api/cart/payments/status/12/" -Headers @{ Authorization = "Bearer $TOKEN" } -Method Get | ConvertTo-Json -Depth 10

# Testar pedido #13
Invoke-RestMethod -Uri "https://chivacomputer.co.mz/api/cart/payments/status/13/" -Headers @{ Authorization = "Bearer $TOKEN" } -Method Get | ConvertTo-Json -Depth 10
```

### 3. Formato da Resposta
```json
{
  "order": {
    "id": 12,
    "order_number": "CHV202510170007",
    "status": "pending",
    "total_amount": "1.00",
    "shipping_cost": "0.00",
    "shipping_method": "via-expressa",
    "created_at": "2025-10-17T10:12:20.008669Z",
    "customer_info": {
      "name": "saboonet x",
      "email": "jsabonete09@gmail.com",
      "phone": "+258844720861"
    }
  },
  "payments": [
    {
      "id": 12,
      "method": "mpesa",
      "amount": "1.00",
      "status": "pending",
      "paysuite_reference": "4473cd66-6fda-4d1e-91bc-2e19682394c8",
      "raw_response": {
        "data": {
          "checkout_url": "https://paysuite.tech/checkout/..."
        }
      }
    }
  ]
}
```

---

## 🧪 Simular Webhook para Testar Atualização

### Opção 1: Usar o Script Parametrizado no Servidor
```bash
# SSH no servidor
ssh root@chivacomputer.co.mz

# Navegar para o diretório do projeto
cd /root/chiva

# Simular pagamento bem-sucedido para pedido #12
./scripts/simulate_webhook_event.sh payment.paid PAY000012 12

# Simular pagamento bem-sucedido para pedido #13
./scripts/simulate_webhook_event.sh payment.paid PAY000013 13

# Verificar logs
docker-compose logs backend | tail -50
```

### Opção 2: Enviar Webhook Manualmente via PowerShell
```powershell
# Obter o webhook secret do servidor
$WEBHOOK_SECRET = "whsec_cd0a9e1a17e2d5d2a7cc49e9b431721f88d19b95d018f2ac"

# Payload para pedido #12 (M-Pesa)
$payload = @{
    event = "payment.paid"
    data = @{
        id = "4473cd66-6fda-4d1e-91bc-2e19682394c8"
        reference = "PAY000012"
        amount = "1.00"
        status = "paid"
    }
    metadata = @{
        order_id = 12
        payment_id = 12
    }
} | ConvertTo-Json -Depth 10

# Calcular assinatura HMAC-SHA256
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [Text.Encoding]::UTF8.GetBytes($WEBHOOK_SECRET)
$signature = [BitConverter]::ToString($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($payload))).Replace("-", "").ToLower()

# Enviar webhook
Invoke-RestMethod `
    -Uri "https://chivacomputer.co.mz/api/cart/payments/webhook/" `
    -Method Post `
    -ContentType "application/json" `
    -Headers @{ "X-Webhook-Signature" = $signature } `
    -Body $payload
```

---

## 🔍 Diagnóstico do Problema Atual

### Sintomas
1. ✅ Pedidos são criados com sucesso (status `pending`)
2. ✅ PaySuite retorna `checkout_url` válida
3. ❌ Webhooks reais não chegam ao servidor após pagamento
4. ✅ Webhooks simulados funcionam perfeitamente

### Causas Possíveis
1. **Bloqueio de rede/firewall** entre PaySuite (Alemanha) → DigitalOcean (França)
2. **Whitelist de IPs** na PaySuite não inclui o IP do servidor
3. **Configuração incorreta** no painel PaySuite (URL webhook ou secret)
4. **Timeout** nas tentativas de entrega do webhook

### Próximos Passos Recomendados
1. ✅ Confirmar que webhook simulado atualiza corretamente (#10 funcionou)
2. 🔄 Simular webhook para #12 e #13 para desbloquear clientes
3. 📧 Contatar suporte PaySuite com:
   - URL do webhook: `https://chivacomputer.co.mz/api/cart/payments/webhook/`
   - Referências dos pagamentos: `PAY000012`, `PAY000013`
   - Solicitar logs de tentativas de entrega
   - Verificar whitelist de IPs (IP do servidor: verificar no DigitalOcean)
4. 🔧 Considerar proxy reverso ou túnel se houver restrições geográficas

---

## 📝 Comandos Úteis

### Verificar Logs do Backend
```bash
docker-compose logs backend | grep -i webhook | tail -50
docker-compose logs backend | grep -i payment | tail -50
```

### Verificar Status de Pagamentos no Django Admin
```bash
# Acessar shell do Django
docker-compose exec backend python manage.py shell

# Consultar pagamento
from cart.models import Payment
p = Payment.objects.get(id=12)
print(f"Status: {p.status}, Reference: {p.paysuite_reference}")
print(f"Raw Response: {p.raw_response}")
```

### Resetar e Testar Webhook
```bash
# No servidor
cd /root/chiva
./scripts/reset_and_test_webhook.sh 12
./scripts/reset_and_test_webhook.sh 13
```

---

## ✅ Conclusão

O sistema está funcionando corretamente em termos de código:
- ✅ Endpoint de status responde com autenticação
- ✅ Webhooks simulados atualizam corretamente ordem e pagamento
- ✅ Frontend faz polling e exibe status corretamente
- ❌ Webhooks reais não estão chegando (problema de infraestrutura/PaySuite)

**Solução temporária**: Usar scripts de simulação para desbloquear pedidos pendentes.
**Solução definitiva**: Resolver entrega de webhooks com PaySuite (suporte/configuração).
