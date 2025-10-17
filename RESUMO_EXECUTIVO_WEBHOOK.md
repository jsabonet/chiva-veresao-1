# 🎯 RESUMO EXECUTIVO: Problema de Status do Pagamento

## ❌ PROBLEMA IDENTIFICADO

**Status do pagamento não atualiza após sucesso/falha**

### Sintoma
- Cliente faz pagamento → PaySuite processa
- Status permanece "pending" indefinidamente
- Frontend continua polling mas nunca recebe atualização
- Após 2 minutos, timeout com status "unknown"

### Causa Raiz
**Webhook URL configurada para localhost (inacessível publicamente)**

```
❌ URL Atual: http://127.0.0.1:8000/api/cart/payments/webhook/
✅ URL Correta: https://chivacomputer.co.mz/api/cart/payments/webhook/
```

---

## ✅ SOLUÇÃO IMPLEMENTADA

### 1. Código Atualizado (✅ Já Feito)
- `backend/.env` agora inclui: `WEBHOOK_BASE_URL=https://chivacomputer.co.mz`
- Código já suporta `WEBHOOK_BASE_URL` configurável
- Template `.env.production` criado

### 2. Ações Necessárias em Produção (⏳ Pendente)

#### Passo 1: Atualizar .env no Servidor
```bash
ssh root@157.230.16.193
nano /home/chiva/chiva-veresao-1/.env
```

**Adicionar/modificar linha:**
```bash
WEBHOOK_BASE_URL=https://chivacomputer.co.mz
```

**Salvar:** Ctrl+X → Y → Enter

#### Passo 2: Reiniciar Backend
```bash
cd /home/chiva/chiva-veresao-1
docker compose restart backend
```

#### Passo 3: Verificar Logs
```bash
docker compose logs -f backend | grep -i webhook
```

**Procurar por:**
```
🔔 Using configured WEBHOOK_BASE_URL: https://chivacomputer.co.mz
```

#### Passo 4: Atualizar Dashboard PaySuite
1. Acessar: https://paysuite.tech/dashboard
2. Ir para: **Settings** → **Webhooks**
3. Localizar: `http://127.0.0.1:8000/api/cart/payments/webhook/`
4. Substituir por: `https://chivacomputer.co.mz/api/cart/payments/webhook/`
5. Clicar em **Save Settings**

---

## 🧪 COMO TESTAR

### Teste Completo End-to-End

1. **Iniciar Pagamento**
   - Criar pedido no frontend
   - Selecionar método (M-Pesa/E-Mola/Cartão)
   - Inserir dados e confirmar

2. **Processar Pagamento**
   - Completar pagamento no gateway PaySuite
   - Aguardar 3-10 segundos

3. **Verificar Atualização**
   - Status deve mudar automaticamente
   - "pending" → "paid" (se bem-sucedido)
   - "pending" → "failed" (se falhou)
   - Frontend deve mostrar mensagem adequada

4. **Verificar Logs**
   ```bash
   docker compose logs backend | grep -E "(Webhook|payment_id|status)"
   ```
   
   **Esperado:**
   ```
   🔔 Webhook received: event=payment.success, payment_id=123, status: pending → paid
   📦 Order ABC123 status updated: pending → paid, stock reduced
   ```

---

## 📊 FLUXO CORRETO

```
┌──────────┐         ┌─────────┐         ┌──────────┐
│ Frontend │         │ Backend │         │ PaySuite │
└────┬─────┘         └────┬────┘         └────┬─────┘
     │                    │                   │
     │ 1. Initiate        │                   │
     ├───────────────────>│                   │
     │                    │                   │
     │                    │ 2. Create         │
     │                    ├──────────────────>│
     │                    │   (webhook_url)   │
     │                    │                   │
     │ 3. payment_id      │                   │
     │<───────────────────┤                   │
     │                    │                   │
     │ 4. Poll /status/   │                   │
     ├───────────────────>│                   │
     │   (every 3s)       │                   │
     │                    │                   │
     │                    │ 5. User pays ✅   │
     │                    │<──────────────────┤
     │                    │                   │
     │                    │ 6. Webhook POST   │
     │                    │<──────────────────┤
     │                    │   {event: success}│
     │                    │                   │
     │                    │ 7. Update status  │
     │                    │    = 'paid'       │
     │                    │                   │
     │ 8. Returns 'paid'  │                   │
     │<───────────────────┤                   │
     │                    │                   │
     │ 9. Show Success ✅ │                   │
```

---

## 📁 ARQUIVOS CRIADOS

1. **`DIAGNOSTICO_STATUS_PAGAMENTO.md`**
   - Análise técnica completa
   - Diagramas de fluxo
   - Código relevante
   - Instruções detalhadas

2. **`backend/.env.production`**
   - Template para produção
   - Todas variáveis necessárias
   - Comentários explicativos

3. **`scripts/fix-webhook-url.ps1`**
   - Script de diagnóstico
   - Verifica configuração atual
   - Adiciona variável ao .env

4. **`RESUMO_EXECUTIVO_WEBHOOK.md`** (este arquivo)
   - Visão geral do problema
   - Passos de correção
   - Instruções de teste

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. Duas Configurações São Necessárias
- ✅ No código (`.env` → `WEBHOOK_BASE_URL`)
- ⏳ No PaySuite dashboard (webhook URL)

### 2. URLs Devem Ser Públicas
- ❌ Localhost NÃO funciona em produção
- ✅ Use domínio real: `https://chivacomputer.co.mz`
- 💡 Em dev local, use ngrok: `https://abc123.ngrok.io`

### 3. Proxy Cloudflare Worker
Você está usando:
```
PAYSUITE_BASE_URL=https://paysuite-proxy.jsabonete09.workers.dev
```

**Verificar:** O worker está repassando webhooks corretamente?

### 4. Modo de Produção
```
PAYSUITE_TEST_MODE=production
```

**Confirmar:**
- API Key é de produção (não sandbox)
- Webhook Secret é de produção

---

## 🔍 TROUBLESHOOTING

### Problema: Webhook não chega
**Sintomas:**
- Status permanece "pending"
- Não há logs de webhook no backend

**Soluções:**
1. Verificar `WEBHOOK_BASE_URL` no servidor
2. Verificar URL no dashboard PaySuite
3. Testar URL manualmente: `curl https://chivacomputer.co.mz/api/cart/payments/webhook/`
4. Verificar firewall/nginx permite POST no endpoint

### Problema: Webhook chega mas falha validação
**Sintomas:**
- Logs mostram: "Invalid signature"
- Status não atualiza

**Soluções:**
1. Verificar `PAYSUITE_WEBHOOK_SECRET` está correto
2. Confirmar secret no dashboard PaySuite
3. Verificar formato do header: `X-Webhook-Signature`

### Problema: Status atualiza mas frontend não mostra
**Sintomas:**
- Logs mostram: "status: pending → paid"
- Frontend continua mostrando "pending"

**Soluções:**
1. Verificar autenticação do usuário (token Firebase)
2. Verificar endpoint `/api/cart/payments/status/<order_id>/`
3. Verificar console do navegador para erros
4. Verificar polling está funcionando (interval de 3s)

---

## 📞 SUPORTE

### Logs Importantes
```bash
# Backend completo
docker compose logs -f backend

# Apenas webhooks
docker compose logs backend | grep -i webhook

# Apenas pagamentos
docker compose logs backend | grep -i payment

# Erros
docker compose logs backend | grep -i error
```

### Verificar Configuração
```bash
# No servidor
docker compose exec backend python -c "
from django.conf import settings; 
print('WEBHOOK_BASE_URL:', settings.WEBHOOK_BASE_URL)
print('PAYSUITE_BASE_URL:', settings.PAYSUITE_BASE_URL)
print('PAYSUITE_API_KEY:', settings.PAYSUITE_API_KEY[:20] + '...')
"
```

### Testar Webhook Manualmente
```bash
# Do servidor PaySuite (ou outra máquina externa)
curl -X POST https://chivacomputer.co.mz/api/cart/payments/webhook/ \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test" \
  -d '{
    "event": "payment.success",
    "data": {
      "id": "test-123",
      "reference": "PAY000001",
      "amount": 100.00,
      "status": "paid"
    }
  }'
```

---

## ✅ CHECKLIST DE DEPLOY

- [ ] Código local atualizado (✅ já feito)
- [ ] Git commit e push (✅ já feito)
- [ ] SSH no servidor de produção
- [ ] Git pull no servidor
- [ ] Adicionar `WEBHOOK_BASE_URL` ao `.env`
- [ ] Reiniciar backend com Docker
- [ ] Verificar logs do backend
- [ ] Atualizar webhook URL no dashboard PaySuite
- [ ] Fazer teste com pagamento real (valor baixo)
- [ ] Verificar status atualiza automaticamente
- [ ] Monitorar logs durante teste
- [ ] Confirmar stock reduzido após pagamento bem-sucedido

---

## 🎓 LIÇÕES APRENDIDAS

1. **Webhooks requerem URLs públicas** - nunca use localhost em produção
2. **Configure ambos os lados** - código E dashboard do provedor
3. **Logs são essenciais** - sempre monitore durante testes
4. **Teste end-to-end** - não assuma que funciona sem testar completamente
5. **Documentação salva tempo** - problemas bem documentados são rapidamente resolvidos

---

**Última Atualização:** 17 de Outubro de 2025  
**Status:** 🟡 AGUARDANDO DEPLOY EM PRODUÇÃO
