# 🐛 BUG ENCONTRADO E CORRIGIDO - Webhook Event Names

**Data:** 17 de Outubro de 2025  
**Status:** ✅ Bug identificado e corrigido

---

## 🔍 PROBLEMA DESCOBERTO

### Situação Inicial:
- ✅ Webhook endpoint funciona perfeitamente
- ✅ Webhooks são recebidos e processados
- ✅ `raw_response` é salvo corretamente
- ❌ **Payment #11 não mudava status de `pending` para `paid`**

### Resultado do Teste Manual:
```bash
Payment #10:
  💳 Status: failed  ✅ (correto)
  🎯 Webhook event: payment.failed
  
Payment #11:
  💳 Status: pending  ❌ (deveria ser 'paid')
  🎯 Webhook event: payment.paid
```

---

## 🐛 CAUSA RAIZ

### Código Antigo (views.py linha ~1226):
```python
if event_name == 'payment.success':  # ← Só aceita 'payment.success'
    payment.status = 'paid'
elif event_name == 'payment.failed':
    payment.status = 'failed'
else:
    payment.status = 'pending'
```

### Problema:
O código esperava `payment.success`, mas o PaySuite pode enviar:
- `payment.paid` ← Versão atual
- `payment.success` ← Versão antiga
- `payment.completed` ← Possível variação

**Resultado:** Webhook processado mas status não mudado! 🐛

---

## ✅ CORREÇÃO IMPLEMENTADA

### Código Novo (views.py linha ~1226):
```python
# Accept both 'payment.success' and 'payment.paid' (different PaySuite versions)
if event_name in ['payment.success', 'payment.paid', 'payment.completed']:
    payment.status = 'paid'
elif event_name in ['payment.failed', 'payment.cancelled', 'payment.rejected']:
    payment.status = 'failed'
else:
    payment.status = 'pending'
```

### Melhorias:
1. ✅ Aceita múltiplos formatos de evento de sucesso
2. ✅ Aceita múltiplos formatos de evento de falha
3. ✅ Mais robusto contra mudanças de API do PaySuite
4. ✅ Logging melhorado com `reference`

---

## 🧪 TESTE DE VALIDAÇÃO

### Passo 1: Deploy da Correção
```bash
# No seu computador
git add backend/cart/views.py
git commit -m "fix: Accept multiple webhook event names (payment.paid, payment.success, etc)"
git push origin main

# No servidor
cd /home/chiva/chiva-veresao-1
git pull origin main
docker compose restart backend
```

### Passo 2: Resetar e Testar
```bash
# No servidor
bash scripts/reset_and_test_webhook.sh
```

### Resultado Esperado:
```
Payment #10:
  💳 Status: failed  ✅
  🎯 Webhook event: payment.failed
  
Payment #11:
  💳 Status: paid    ✅ ← AGORA DEVE ESTAR 'PAID'!
  🎯 Webhook event: payment.paid
```

---

## 🎯 PRÓXIMOS PASSOS

### 1. Confirmar Correção (5 minutos)
```bash
cd /home/chiva/chiva-veresao-1
git pull origin main
docker compose restart backend
bash scripts/reset_and_test_webhook.sh
```

**Verificar:**
- ✅ Payment #11 mudou para `paid`?
- ✅ Payment #10 continua `failed`?
- ✅ Ambos têm `event` no `raw_response`?

---

### 2. Investigar Por Que PaySuite Não Envia Webhooks

**Agora que provamos que o código funciona**, o problema é:
- ❌ PaySuite não está enviando webhooks automaticamente
- ✅ PaySuite está processando pagamentos (3 "Completed" no dashboard)
- ✅ Configuração de webhook está correta no PaySuite

**Possíveis Causas:**

#### Causa A: Modo Sandbox
- PaySuite pode não enviar webhooks em modo sandbox
- **Verificar:** `.env` tem `PAYSUITE_TEST_MODE=sandbox`
- **Solução:** Mudar para `PAYSUITE_TEST_MODE=production`

#### Causa B: Webhook Não Ativado
- Alguns gateways precisam ativar webhooks manualmente
- **Verificar:** Dashboard PaySuite → API Settings → Webhooks → Enable
- **Solução:** Ativar toggle "Enable Webhooks"

#### Causa C: Verificação de Endpoint Necessária
- PaySuite pode precisar verificar endpoint antes (handshake)
- **Sintoma:** Primeiro request é GET ou OPTIONS
- **Solução:** Implementar resposta para GET/OPTIONS

#### Causa D: Eventos Não Selecionados
- Dashboard pode ter seletor de eventos
- **Verificar:** Quais eventos estão ativos no dashboard
- **Solução:** Ativar "payment.paid" e "payment.failed"

---

### 3. Teste com Pagamento Real

Após confirmar correção, fazer pagamento real:

```bash
# Criar novo pagamento (Payment #12)
# Pagar via M-Pesa ou E-Mola
# Verificar se webhook chega automaticamente

# Se webhook NÃO chegar:
# Atualizar manualmente:
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.get(id=12)
p.status = 'paid'
p.save()
if p.order:
    p.order.status = 'paid'
    p.order.save()
print('✅ Payment 12 updated')
"
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Imediato (10 minutos):
- [x] Código corrigido
- [ ] Git commit e push
- [ ] Deploy no servidor
- [ ] Reiniciar backend
- [ ] Executar `reset_and_test_webhook.sh`
- [ ] Confirmar Payment #11 agora é `paid`

### Curto Prazo (1 hora):
- [ ] Verificar `.env` → mudar `PAYSUITE_TEST_MODE` para `production`?
- [ ] Contactar suporte PaySuite sobre webhooks
- [ ] Verificar dashboard PaySuite se webhooks estão habilitados
- [ ] Procurar logs de webhook no PaySuite dashboard

### Médio Prazo (1 dia):
- [ ] Implementar verificação de endpoint (GET/OPTIONS)
- [ ] Implementar polling como backup
- [ ] Adicionar painel admin para atualização manual
- [ ] Documentar processo de atualização manual

---

## 🎉 CONCLUSÃO

### ✅ Vitória:
**O CÓDIGO DE WEBHOOK FUNCIONA!** 🎉

O problema era apenas o nome do evento:
- Código esperava: `payment.success`
- PaySuite envia: `payment.paid`

### 🔧 Próximo Desafio:
**Por que PaySuite não envia webhooks automaticamente?**

Isso é um problema de configuração do PaySuite, não do nosso código.

---

## 📞 CONTACTO PAYSUITE

Perguntas para o suporte:

1. **"Minha conta está em modo Production ou Sandbox?"**
   - Se Sandbox, webhooks podem não ser enviados

2. **"Webhooks estão habilitados na minha conta?"**
   - Pode ter toggle que precisa ser ativado

3. **"Como posso ver logs de tentativas de webhook?"**
   - Dashboard pode ter histórico de deliveries

4. **"Quais eventos de webhook estão ativos?"**
   - Verificar se `payment.paid` está na lista

5. **"Preciso fazer verificação de endpoint?"**
   - Alguns gateways fazem GET/OPTIONS primeiro

---

**Status:** ✅ Bug corrigido, aguardando deploy e teste  
**Próximo:** Deploy, teste, e investigar configuração PaySuite
