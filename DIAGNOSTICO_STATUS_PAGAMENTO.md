# 🔍 DIAGNÓSTICO: Por que o Status do Pagamento Não Atualiza

## 📋 Resumo do Problema

Após criar um pedido e iniciar o pagamento, o status permanece em **"pending"** indefinidamente, nunca mudando para **"paid"** ou **"failed"**, mesmo quando o pagamento é bem-sucedido ou falha.

## 🎯 CAUSA RAIZ IDENTIFICADA

### Problema Principal: **URL do Webhook Incorreta**

O sistema está configurado para enviar o webhook do PaySuite para:
```
http://127.0.0.1:8000/api/cart/payments/webhook/
```

**Esta URL é localhost e NÃO é acessível publicamente!**

### Por que isso causa o problema?

1. **Cliente faz pagamento** → PaySuite processa
2. **PaySuite tenta enviar webhook** → `http://127.0.0.1:8000/api/cart/payments/webhook/`
3. **Webhook FALHA** porque PaySuite não consegue acessar localhost do seu servidor
4. **Status nunca atualiza** porque o webhook nunca chega
5. **Frontend continua polling** mas sempre retorna "pending"

---

## 🔎 Análise Técnica Detalhada

### 1. Fluxo Normal (Como DEVERIA funcionar)

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│  Frontend   │         │   Backend    │         │    PaySuite     │
└──────┬──────┘         └──────┬───────┘         └────────┬────────┘
       │                       │                          │
       │ 1. POST /initiate/    │                          │
       │─────────────────────>│                          │
       │                       │                          │
       │                       │ 2. Create Payment        │
       │                       │─────────────────────────>│
       │                       │   (webhook_url included) │
       │                       │                          │
       │ 3. Return payment_id  │                          │
       │<─────────────────────│                          │
       │                       │                          │
       │ 4. Navigate to        │                          │
       │    /order-confirmation│                          │
       │                       │                          │
       │ 5. Poll /status/      │                          │
       │─────────────────────>│                          │
       │   (every 3s)          │                          │
       │                       │                          │
       │                       │ 6. User pays ✅          │
       │                       │<─────────────────────────│
       │                       │                          │
       │                       │ 7. Webhook POST          │
       │                       │<─────────────────────────│
       │                       │   (payment.success)      │
       │                       │                          │
       │                       │ 8. Update status='paid'  │
       │                       │                          │
       │ 9. Poll returns 'paid'│                          │
       │<─────────────────────│                          │
       │                       │                          │
       │ 10. Show success ✅   │                          │
```

### 2. Fluxo Atual (O que está ACONTECENDO)

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│  Frontend   │         │   Backend    │         │    PaySuite     │
└──────┬──────┘         └──────┬───────┘         └────────┬────────┘
       │                       │                          │
       │ 1. POST /initiate/    │                          │
       │─────────────────────>│                          │
       │                       │                          │
       │                       │ 2. Create Payment        │
       │                       │─────────────────────────>│
       │                       │   webhook: localhost ❌   │
       │                       │                          │
       │ 3. Return payment_id  │                          │
       │<─────────────────────│                          │
       │                       │                          │
       │ 4. Navigate to        │                          │
       │    /order-confirmation│                          │
       │                       │                          │
       │ 5. Poll /status/      │                          │
       │─────────────────────>│                          │
       │   (every 3s)          │                          │
       │                       │                          │
       │                       │ 6. User pays ✅          │
       │                       │<─────────────────────────│
       │                       │                          │
       │                       │ 7. ❌ WEBHOOK FAILS      │
       │                       │  (localhost unreachable) │
       │                       │                          │
       │ 8. Poll returns       │                          │
       │    'pending' forever  │                          │
       │<─────────────────────│                          │
       │                       │                          │
       │ 9. Timeout after 2min │                          │
       │    Status: unknown ❌ │                          │
```

---

## 📂 Código Relevante

### 1. Backend: `views.py` - Função `initiate_payment` (linha 959)

```python
# Use WEBHOOK_BASE_URL from settings if configured, otherwise use request host
from django.conf import settings

if hasattr(settings, 'WEBHOOK_BASE_URL') and settings.WEBHOOK_BASE_URL:
    # Use configured webhook base URL (for ngrok or production)
    callback_url = f"{settings.WEBHOOK_BASE_URL.rstrip('/')}/api/cart/payments/webhook/"
    return_url = f"{settings.WEBHOOK_BASE_URL.rstrip('/')}/orders/status"
    logger.info(f"🔔 Using configured WEBHOOK_BASE_URL: {settings.WEBHOOK_BASE_URL}")
else:
    # Fallback to request host (default behavior)
    callback_url = request.build_absolute_uri('/api/cart/payments/webhook/')
    return_url = request.build_absolute_uri(f'/orders/status')
    logger.info(f"🔔 Using request host for webhook: {callback_url}")
```

**Problema:** O código está usando `WEBHOOK_BASE_URL` do settings, que está definido como `http://127.0.0.1:8000`

### 2. Backend: `settings.py` (linha 37)

```python
# Base URL for webhook callbacks (MUST be publicly accessible)
WEBHOOK_BASE_URL = config(
    'WEBHOOK_BASE_URL',
    default='http://127.0.0.1:8000'  # Default for development
)
```

**Problema:** O default é localhost, adequado para desenvolvimento com ngrok, mas NUNCA para produção.

### 3. Backend: `.env` (FALTANDO)

```properties
# PaySuite Configuration
PAYSUITE_BASE_URL = "https://paysuite-proxy.jsabonete09.workers.dev"
PAYSUITE_API_KEY=735|X8mGsE4xIXgJwdi6wQETXQn1LExmz4LW4TZiL8j908f03b48
PAYSUITE_WEBHOOK_SECRET=whsec_cd0a9e1a17e2d5d2a7cc49e9b431721f88d19b95d018f2ac
PAYSUITE_TEST_MODE=production
```

**❌ FALTA:** `WEBHOOK_BASE_URL=https://chivacomputer.co.mz`

### 4. Backend: `views.py` - Função `paysuite_webhook` (linha 1177)

```python
@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def paysuite_webhook(request):
    """Endpoint to receive Paysuite callbacks/webhooks"""
    try:
        # ... validação de assinatura ...
        
        # Find payment by external id or reference
        reference = data_block.get('id') or data_block.get('reference')
        payment = Payment.objects.filter(paysuite_reference=reference).first()
        
        # Update payment status based on event name
        old_payment_status = payment.status
        if event_name == 'payment.success':
            payment.status = 'paid'
        elif event_name == 'payment.failed':
            payment.status = 'failed'
        else:
            payment.status = 'pending'
        
        payment.raw_response = data
        payment.save(update_fields=['status', 'raw_response'])
        
        logger.info(f"🔔 Webhook received: event={event_name}, payment_id={payment.id}, status: {old_payment_status} → {payment.status}")
        
        # If payment succeeded, create/update order...
```

**Este código está CORRETO**, mas nunca é executado porque o webhook nunca chega!

### 5. Frontend: `OrderConfirmation.tsx` - Polling

```typescript
useEffect(() => {
  // Poll payment status every 3 seconds
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/cart/payments/status/${orderId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      // Check payment status
      if (data.payments?.[0]?.status === 'paid') {
        setStatus('paid');
        clearInterval(interval);
      } else if (data.payments?.[0]?.status === 'failed') {
        setStatus('failed');
        clearInterval(interval);
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }
  }, 3000); // Poll every 3 seconds
  
  // Timeout after 2 minutes
  const timeout = setTimeout(() => {
    clearInterval(interval);
    setStatus('unknown');
  }, 120000); // 2 minutes
  
  return () => {
    clearInterval(interval);
    clearTimeout(timeout);
  };
}, [orderId, token]);
```

**Este código está CORRETO**, mas continua retornando "pending" porque o backend nunca recebe o webhook.

---

## ✅ SOLUÇÕES

### Solução 1: Configurar WEBHOOK_BASE_URL no Ambiente de Produção

#### No Servidor de Produção

**Arquivo:** `/home/chiva/chiva-veresao-1/.env`

Adicionar a linha:
```bash
WEBHOOK_BASE_URL=https://chivacomputer.co.mz
```

**Reiniciar o backend:**
```bash
docker compose restart backend
```

### Solução 2: Atualizar URL do Webhook no Dashboard do PaySuite

**IMPORTANTE:** Você também precisa atualizar a URL no dashboard do PaySuite!

1. Acesse: https://paysuite.tech/dashboard (ou URL correta do dashboard)
2. Navegue para **Settings** → **Webhooks** (ou similar)
3. Localize a configuração atual:
   ```
   ❌ http://127.0.0.1:8000/api/cart/payments/webhook/
   ```
4. Substitua por:
   ```
   ✅ https://chivacomputer.co.mz/api/cart/payments/webhook/
   ```
5. Clique em **Save Settings**

---

## 🧪 Como Verificar se o Problema Foi Resolvido

### 1. Verificar Configuração Local

```bash
cd backend
python -c "from django.conf import settings; import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings'); import django; django.setup(); print('WEBHOOK_BASE_URL:', settings.WEBHOOK_BASE_URL)"
```

**Esperado em Produção:** `https://chivacomputer.co.mz`  
**Esperado em Desenvolvimento:** URL do ngrok (ex: `https://abc123.ngrok.io`)

### 2. Verificar Logs do Backend

Quando um pagamento é iniciado, você deve ver:
```
🔔 Using configured WEBHOOK_BASE_URL: https://chivacomputer.co.mz
💰 PAYMENT DETAILS: ID=123, Charge=1000.00...
🌐 PAYSUITE CLIENT - PAYLOAD: {..., "callback_url": "https://chivacomputer.co.mz/api/cart/payments/webhook/"}
```

### 3. Verificar Webhook Chegando

Quando o PaySuite enviar o webhook, você deve ver:
```
🔔 Webhook received: event=payment.success, payment_id=123, status: pending → paid
📦 Order ABC123 (id=45) status updated: pending → paid, stock reduced
```

### 4. Fazer Teste End-to-End

1. **Criar um pedido** no frontend
2. **Fazer pagamento** (pode usar valor baixo para teste)
3. **Aguardar 3-10 segundos**
4. **Verificar se status atualiza** automaticamente no frontend

---

## 🚨 Problemas Secundários Identificados

### 1. PaySuite Proxy Worker

Você está usando um proxy Cloudflare Worker:
```
PAYSUITE_BASE_URL = "https://paysuite-proxy.jsabonete09.workers.dev"
```

**Verificar:** O worker está repassando corretamente os webhooks? Ele precisa:
- Aceitar POST no endpoint `/api/v1/payments`
- Repassar callbacks/webhooks recebidos do PaySuite para o backend

### 2. Modo de Teste vs Produção

```properties
PAYSUITE_TEST_MODE=production
```

Isso está correto para produção, mas garanta que:
- A chave API é da conta de **produção** (não sandbox)
- O webhook secret é da conta de **produção**

---

## 📝 Checklist de Correção

### Desenvolvimento Local (com ngrok)

- [ ] Instalar ngrok
- [ ] Iniciar ngrok: `ngrok http 8000`
- [ ] Copiar URL do ngrok (ex: `https://abc123.ngrok.io`)
- [ ] Adicionar ao `.env`: `WEBHOOK_BASE_URL=https://abc123.ngrok.io`
- [ ] Reiniciar backend
- [ ] Fazer teste de pagamento

### Produção (chivacomputer.co.mz)

- [ ] SSH no servidor: `ssh root@157.230.16.193`
- [ ] Editar `.env`: `nano /home/chiva/chiva-veresao-1/.env`
- [ ] Adicionar: `WEBHOOK_BASE_URL=https://chivacomputer.co.mz`
- [ ] Salvar e sair (Ctrl+X, Y, Enter)
- [ ] Reiniciar backend: `cd /home/chiva/chiva-veresao-1 && docker compose restart backend`
- [ ] Verificar logs: `docker compose logs -f backend`
- [ ] Atualizar URL no dashboard do PaySuite
- [ ] Fazer teste de pagamento real

---

## 🎓 Lições Aprendidas

### 1. Webhooks requerem URLs públicas
- Localhost (`127.0.0.1`) nunca funciona em produção
- Use ngrok para desenvolvimento local
- Use domínio real em produção

### 2. Sempre configurar webhooks em ambos os lados
- No código (callback_url)
- No dashboard do provedor (PaySuite)

### 3. Logs são essenciais
- O código já tem logs detalhados (`logger.info`)
- Use-os para debugging: `docker compose logs -f backend`

### 4. Testes end-to-end são necessários
- Não assume que funciona localmente = funciona em produção
- Sempre teste o fluxo completo após deploy

---

## 📞 Próximos Passos

1. **URGENTE:** Adicionar `WEBHOOK_BASE_URL` ao `.env` de produção
2. **URGENTE:** Atualizar webhook URL no dashboard do PaySuite
3. **Reiniciar** o backend em produção
4. **Testar** com pagamento real (valor baixo)
5. **Monitorar** logs durante o teste
6. **Verificar** se status atualiza automaticamente

---

## 🔗 Arquivos Relacionados

- `backend/cart/views.py` - Lógica de pagamento e webhook
- `backend/cart/payments/paysuite.py` - Cliente PaySuite
- `backend/chiva_backend/settings.py` - Configuração do Django
- `backend/.env` - Variáveis de ambiente
- `frontend/src/pages/OrderConfirmation.tsx` - Polling de status
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Guia completo de deploy
- `NGROK_DEVELOPMENT_SETUP.md` - Setup para desenvolvimento local

---

**Data:** 17 de Outubro de 2025  
**Status:** 🔴 PROBLEMA IDENTIFICADO - AGUARDANDO CORREÇÃO
