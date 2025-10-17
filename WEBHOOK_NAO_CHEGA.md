# 🚨 CONFIRMADO: Webhook Não Está Chegando

## 📊 EVIDÊNCIA DOS LOGS

### Frontend (Console do Navegador)
```javascript
💳 Latest Payment: {
  id: 10, 
  status: 'pending',  // ← NUNCA muda!
  method: 'mpesa', 
  paysuite_reference: '45782747-fbeb-482a-8cf0-c562ae531f37'
}

📊 Poll Response: {
  order_id: 10, 
  order_status: 'pending',    // ← NUNCA muda!
  payment_status: 'pending',  // ← NUNCA muda!
  effective_status: 'pending' // ← NUNCA muda!
}
```

**Repetiu 13+ vezes** sem mudança de status!

### Backend (Banco de Dados)
```python
Payment 10: 
  status='pending'  # ← Ainda pending
  paysuite_ref='712bdfc6-2944-4a95-bdd6-f636bfb9b026'
  raw_response={
    'data': {
      'id': '712bdfc6-2944-4a95-bdd6-f636bfb9b026',
      'amount': '988000.00',
      'reference': 'ORD000010',
      'checkout_url': 'https://paysuite.tech/checkout/...'
    },
    'status': 'success'  # ← PaySuite criou o pagamento
  }
```

### Configuração Local
```
WEBHOOK_BASE_URL: https://chivacomputer.co.mz  ✅ Correto
```

## ❌ O QUE ESTÁ FALTANDO

Se o webhook tivesse chegado, o `raw_response` seria atualizado com o evento do PaySuite:

```python
# ESPERADO (se webhook chegasse):
raw_response = {
  'event': 'payment.failed',  # ou 'payment.success'
  'data': {
    'id': '712bdfc6-2944-4a95-bdd6-f636bfb9b026',
    'status': 'failed',
    'reason': 'insufficient_funds'
  }
}
```

**MAS:** O `raw_response` ainda tem apenas a resposta inicial do `create_payment`, não tem o evento do webhook!

## 🔍 DIAGNÓSTICO

### Possibilidades:

#### 1. ❌ Webhook URL no Dashboard do PaySuite Está Errada
**Mais Provável!**

O dashboard do PaySuite ainda está configurado com:
```
http://127.0.0.1:8000/api/cart/payments/webhook/
```

Ao invés de:
```
https://chivacomputer.co.mz/api/cart/payments/webhook/
```

**Como Verificar:**
1. Acessar: https://paysuite.tech/dashboard (ou URL do dashboard)
2. Ir para: Settings → Webhooks
3. Verificar a URL configurada

#### 2. ❌ Endpoint Webhook Não Está Acessível
**Menos Provável**

O endpoint pode estar bloqueado por:
- Firewall
- Nginx não configurado
- Django não escutando na rota

**Como Testar:**
```bash
# De uma máquina externa (ou use https://reqbin.com/)
curl -X POST https://chivacomputer.co.mz/api/cart/payments/webhook/ \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

**Esperado:** Status 200 ou 400 (não 404 ou 502)

#### 3. ❌ PaySuite Não Está Enviando Webhooks
**Menos Provável**

O PaySuite pode não estar configurado para enviar webhooks, ou pode ter um delay muito grande.

## ✅ SOLUÇÃO IMEDIATA

### Passo 1: Atualizar Dashboard do PaySuite (CRÍTICO!)

1. **Acessar Dashboard:**
   - URL: https://paysuite.tech/dashboard
   - Ou: https://app.paysuite.co.mz
   - Login com suas credenciais

2. **Navegar para Webhooks:**
   - Settings → Webhooks
   - Ou: API → Webhooks
   - Ou: Developers → Webhooks

3. **Localizar URL Atual:**
   ```
   ❌ http://127.0.0.1:8000/api/cart/payments/webhook/
   ```

4. **Substituir por URL de Produção:**
   ```
   ✅ https://chivacomputer.co.mz/api/cart/payments/webhook/
   ```

5. **Salvar Configurações**

6. **Testar Webhook (se disponível):**
   - Alguns dashboards têm botão "Test Webhook"
   - Isso enviará um webhook de teste

### Passo 2: Verificar Logs do Backend

Após atualizar o webhook no dashboard:

```bash
# SSH no servidor
ssh root@157.230.16.193

# Monitorar logs
docker compose logs -f backend | grep -i webhook
```

**Esperado após fazer novo pagamento:**
```
🔔 Webhook received: event=payment.failed, payment_id=10, status: pending → failed
✅ Synced order 10 status: pending → failed
```

### Passo 3: Fazer Novo Teste

1. Criar novo pedido (order_id = 11)
2. Tentar pagamento (pode usar valor baixo)
3. Deixar falhar (ou completar)
4. Aguardar 3-10 segundos
5. Verificar se status atualiza

## 🧪 TESTE MANUAL DO WEBHOOK

Se quiser testar se o endpoint está funcionando:

### Teste 1: Webhook de Teste (Simulação)

```bash
# No servidor de produção
curl -X POST http://localhost:8000/api/cart/payments/webhook/ \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.failed",
    "data": {
      "id": "712bdfc6-2944-4a95-bdd6-f636bfb9b026",
      "reference": "ORD000010",
      "amount": 988000.00,
      "status": "failed",
      "reason": "insufficient_funds"
    }
  }'
```

**Esperado:** Status do payment 10 muda para `failed`

### Teste 2: Verificar Endpoint Externo

```bash
# De qualquer máquina (ou use https://reqbin.com/)
curl -v https://chivacomputer.co.mz/api/cart/payments/webhook/
```

**Esperado:**
- Status: 405 Method Not Allowed (normal, pois webhook é POST)
- Ou: 400 Bad Request (se aceitar GET mas rejeitar payload)
- **NÃO:** 404 Not Found ou 502 Bad Gateway

## 📋 CHECKLIST DE CORREÇÃO

### No Dashboard do PaySuite
- [ ] Acessar dashboard do PaySuite
- [ ] Localizar configuração de webhooks
- [ ] Verificar URL atual (provavelmente localhost)
- [ ] Atualizar para: `https://chivacomputer.co.mz/api/cart/payments/webhook/`
- [ ] Salvar configurações
- [ ] Testar webhook (se disponível)

### No Servidor de Produção
- [ ] Verificar que backend está rodando
- [ ] Verificar que endpoint `/api/cart/payments/webhook/` existe
- [ ] Monitorar logs durante teste
- [ ] Verificar que nginx está configurado corretamente

### Teste End-to-End
- [ ] Criar novo pedido
- [ ] Fazer pagamento (pode falhar de propósito)
- [ ] Aguardar 3-10 segundos
- [ ] Verificar logs do webhook
- [ ] Confirmar status atualiza no frontend

## 🎯 PRÓXIMA AÇÃO

**URGENTE:** Atualizar webhook URL no dashboard do PaySuite!

Sem isso, NENHUM webhook chegará ao servidor, e TODOS os pagamentos ficarão com status `pending` indefinidamente.

---

**Situação Atual:** 🔴 WEBHOOK NÃO ESTÁ CHEGANDO  
**Causa Raiz:** Dashboard PaySuite configurado com localhost  
**Ação Necessária:** Atualizar URL no dashboard  
**Prioridade:** 🔥 CRÍTICA - Bloqueia TODAS as confirmações de pagamento
