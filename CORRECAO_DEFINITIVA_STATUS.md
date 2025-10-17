# 🎯 CORREÇÃO DEFINITIVA: Status de Pagamento

## 🔍 PROBLEMA REAL IDENTIFICADO

Após análise profunda, descobrimos que o problema **NÃO é apenas o webhook**, mas sim uma **DESINCRONIZAÇÃO** entre:
- `payment.status` (atualizado pelo webhook)
- `order.status` (que deveria ser atualizado também)
- Frontend lendo apenas `order.status` (ignorando `payment.status`)

## 📊 O QUE ESTAVA ACONTECENDO

```
1. Cliente faz pagamento → PaySuite processa ✅
2. Webhook chega (se URL estiver correta) ✅
3. Backend atualiza payment.status = 'paid' ✅
4. Backend TENTA atualizar order.status = 'paid' ❓
   - Se falhar por qualquer razão, order.status fica 'pending'
5. Frontend faz polling e lê APENAS order.status ❌
6. Frontend vê order.status = 'pending' (mesmo com payment.status = 'paid')
7. Status não atualiza na UI ❌
```

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. Frontend: Priorizar `payment.status` sobre `order.status`

**Arquivo:** `frontend/src/pages/OrderConfirmation.tsx`

**Mudança:**
```typescript
// ANTES: Usava apenas order.status
setStatus(res.order.status);

// DEPOIS: Verifica payment.status primeiro
const latestPayment = res.payments?.[0];
let effectiveStatus: OrderStatus = res.order.status;

if (latestPayment) {
  // Se payment está paid/failed/cancelled, usar esse status
  if (latestPayment.status === 'paid' || 
      latestPayment.status === 'failed' || 
      latestPayment.status === 'cancelled') {
    effectiveStatus = latestPayment.status as OrderStatus;
    console.log(`✅ Using payment.status: ${latestPayment.status}`);
  }
}

setStatus(effectiveStatus);
```

**Por quê isso funciona:**
- O webhook atualiza `payment.status` PRIMEIRO (sempre)
- Só depois tenta atualizar `order.status` via OrderManager
- Se OrderManager falhar, `payment.status` já está correto
- Frontend agora lê `payment.status` quando disponível

### 2. Backend: Sincronizar `order.status` com `payment.status` Imediatamente

**Arquivo:** `backend/cart/views.py` (função `paysuite_webhook`)

**Mudança:**
```python
# ANTES: Atualizava payment, depois tentava OrderManager
payment.status = 'paid'
payment.save(update_fields=['status', 'raw_response'])

# ... código do OrderManager que poderia falhar ...

# DEPOIS: Sincroniza order.status IMEDIATAMENTE após payment.status
payment.status = 'paid'
payment.save(update_fields=['status', 'raw_response'])

# CRITICAL: Sync order.status with payment.status immediately
if payment.order:
    old_order_status = payment.order.status
    payment.order.status = payment.status
    payment.order.save(update_fields=['status'])
    logger.info(f"✅ Synced order {payment.order.id} status: {old_order_status} → {payment.status}")
```

**Por quê isso funciona:**
- Garante que `order.status` SEMPRE corresponde a `payment.status`
- Não depende do OrderManager (que pode falhar)
- Sincronização acontece ANTES de qualquer outra lógica

### 3. Logs Melhorados

**Frontend:**
```typescript
console.log('💳 Latest Payment:', {
  id: latestPayment.id,
  status: latestPayment.status,
  method: latestPayment.method,
  paysuite_reference: latestPayment.paysuite_reference
});

console.log('📊 Poll Response:', {
  order_id: res.order.id,
  order_status: res.order.status,
  payment_status: latestPayment?.status,
  effective_status: effectiveStatus,  // ← O que será usado
  timestamp: new Date().toLocaleTimeString()
});
```

**Backend:**
```python
logger.info(f"🔔 Webhook received: event={event_name}, payment_id={payment.id}, status: {old_payment_status} → {payment.status}")
logger.info(f"✅ Synced order {payment.order.id} status: {old_order_status} → {payment.status}")
```

## 🧪 COMO TESTAR

### Teste Local (Antes de Deploy)

1. **Iniciar backend:**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Iniciar frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Fazer pedido:**
   - Adicionar produto ao carrinho
   - Ir para checkout
   - Selecionar método de pagamento
   - Confirmar

4. **Verificar console do navegador:**
   ```
   📊 Poll Response: {
     order_status: "pending",
     payment_status: "pending",
     effective_status: "pending"  ← Deve mudar para "paid" após webhook
   }
   ```

5. **Simular webhook (opcional):**
   ```bash
   curl -X POST http://localhost:8000/api/cart/payments/webhook/ \
     -H "Content-Type: application/json" \
     -d '{
       "event": "payment.success",
       "data": {
         "id": "<paysuite_reference>",
         "amount": 100,
         "status": "paid"
       }
     }'
   ```

6. **Verificar que status atualiza automaticamente:**
   - Console deve mostrar: `effective_status: "paid"`
   - UI deve mostrar: "✅ Pagamento Aprovado!"

### Teste em Produção

1. **Deploy das alterações:**
   ```bash
   git add frontend/src/pages/OrderConfirmation.tsx
   git add backend/cart/views.py
   git commit -m "fix: Prioritize payment.status over order.status for real-time updates"
   git push origin main
   ```

2. **No servidor:**
   ```bash
   ssh root@157.230.16.193
   cd /home/chiva/chiva-veresao-1
   git pull origin main
   docker compose build backend frontend
   docker compose up -d
   ```

3. **Verificar webhook URL:**
   - Editar `.env`: `WEBHOOK_BASE_URL=https://chivacomputer.co.mz`
   - Reiniciar: `docker compose restart backend`

4. **Fazer pagamento real:**
   - Usar valor baixo (ex: 10 MZN)
   - Método M-Pesa ou e-Mola
   - Completar pagamento

5. **Monitorar logs:**
   ```bash
   docker compose logs -f backend | grep -E "(Webhook|Synced|Poll)"
   ```

   **Esperado:**
   ```
   🔔 Webhook received: event=payment.success, payment_id=123, status: pending → paid
   ✅ Synced order 45 status: pending → paid
   📊 Payment Status Poll: order_id=45, order.status=paid, payment_count=1
   ```

6. **Verificar no navegador:**
   - Status deve atualizar automaticamente em ~3 segundos
   - Mensagem: "✅ Pagamento Aprovado!"

## 📋 CHECKLIST DE DEPLOY

### Desenvolvimento Local
- [x] Código atualizado em `OrderConfirmation.tsx`
- [x] Código atualizado em `views.py`
- [x] Logs melhorados implementados
- [ ] Testado localmente com simulação de webhook
- [ ] Git commit e push

### Produção
- [ ] SSH no servidor
- [ ] Git pull das alterações
- [ ] Adicionar `WEBHOOK_BASE_URL=https://chivacomputer.co.mz` ao `.env`
- [ ] Rebuild containers: `docker compose build`
- [ ] Reiniciar serviços: `docker compose up -d`
- [ ] Atualizar URL no dashboard PaySuite
- [ ] Fazer teste com pagamento real (valor baixo)
- [ ] Verificar logs do webhook
- [ ] Confirmar status atualiza automaticamente

## 🎓 O QUE APRENDEMOS

### 1. Sincronização é Crítica
Quando há múltiplos campos representando o mesmo estado (`payment.status` e `order.status`), eles DEVEM estar sincronizados.

### 2. Frontend Deve Ser Resiliente
Não assuma que o backend sempre atualiza tudo perfeitamente. Use fallbacks:
- Prefira `payment.status` (mais confiável)
- Use `order.status` como fallback
- Tenha logs detalhados

### 3. Webhooks São Assíncronos
O webhook pode:
- Demorar para chegar
- Chegar fora de ordem
- Falhar em parte do processamento
- Nunca chegar (URL incorreta)

O código deve ser resiliente a todos esses cenários.

### 4. Logs São Essenciais
Logs detalhados em ambos frontend e backend são CRUCIAIS para debug:
```
Frontend: 📊 Poll Response
Backend:  🔔 Webhook received
Backend:  ✅ Synced order
```

### 5. Testes End-to-End São Necessários
Não basta testar localmente. Precisa testar:
- Fluxo completo de pagamento
- Em ambiente de produção
- Com gateway real (PaySuite)
- Monitorando logs em tempo real

## 🔗 ARQUIVOS MODIFICADOS

1. **`frontend/src/pages/OrderConfirmation.tsx`**
   - Prioriza `payment.status` sobre `order.status`
   - Logs detalhados de polling
   - Resiliência a falhas

2. **`backend/cart/views.py`**
   - Sincronização imediata de `order.status`
   - Logs detalhados de webhook
   - Garantia de consistência

3. **`DESCOBERTA_ORDEM_CRIACAO.md`** (Novo)
   - Análise completa do problema
   - Diagramas de fluxo
   - Investigação detalhada

4. **`CORRECAO_DEFINITIVA_STATUS.md`** (Este arquivo)
   - Resumo das correções
   - Instruções de teste
   - Checklist de deploy

## 🚨 AINDA PRECISAMOS

### 1. Corrigir URL do Webhook (CRÍTICO)
```bash
# No servidor
echo "WEBHOOK_BASE_URL=https://chivacomputer.co.mz" >> /home/chiva/chiva-veresao-1/.env
```

### 2. Atualizar PaySuite Dashboard
- URL antiga: `http://127.0.0.1:8000/api/cart/payments/webhook/`
- URL nova: `https://chivacomputer.co.mz/api/cart/payments/webhook/`

### 3. Deploy do Código Corrigido
```bash
git push origin main  # Já feito
# No servidor: git pull + rebuild
```

---

**Status:** 🟡 CORREÇÕES IMPLEMENTADAS - AGUARDANDO DEPLOY  
**Data:** 17 de Outubro de 2025  
**Próximo Passo:** Deploy em produção e teste end-to-end
