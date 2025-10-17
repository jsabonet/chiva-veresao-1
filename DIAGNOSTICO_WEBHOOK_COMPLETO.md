# 🎯 DIAGNÓSTICO COMPLETO - WEBHOOKS PAYSUITE

**Data:** 17 de Outubro de 2025  
**Status:** ⚠️ Webhooks não estão chegando apesar de configuração correta

---

## 📊 SITUAÇÃO ATUAL

### ✅ O QUE ESTÁ CORRETO:

1. **Configuração PaySuite Dashboard:**
   - ✅ Webhook URL: `https://chivacomputer.co.mz/api/cart/payments/webhook/`
   - ✅ Webhook Secret: `whsec_cd0a9e1a17e2d5...` (correto no .env)
   - ✅ 3 transações completadas no dashboard do PaySuite

2. **Configuração Backend:**
   - ✅ `WEBHOOK_BASE_URL`: `https://chivacomputer.co.mz`
   - ✅ Endpoint webhook existe e responde (HTTP 405 para GET = correto)
   - ✅ Código sincroniza order.status com payment.status

3. **Infraestrutura:**
   - ✅ HTTPS funcionando (certificado válido)
   - ✅ Endpoint acessível externamente
   - ✅ Nginx configurado corretamente

### ❌ O QUE ESTÁ ERRADO:

1. **DEBUG=True em Produção:** 🚨
   - ⚠️ Django rodando com `DEBUG=True` em produção
   - Isso pode causar problemas de performance e segurança
   - Pode afetar processamento de webhooks

2. **Webhooks Não Chegam:**
   - ❌ Payment #11: `status=pending` (deveria ser `paid`)
   - ❌ Payment #10: `status=pending` (deveria ser `paid/failed`)
   - ❌ Payment #9: `status=pending` (deveria ser `paid`)
   - ❌ Nenhum tem `event` no `raw_response`

3. **Discrepância PaySuite vs Banco:**
   - ✅ PaySuite Dashboard: 3 payments "Completed"
   - ❌ Nosso banco: 3 payments "pending"
   - **Conclusão:** Webhooks não estão sendo enviados/recebidos

---

## 🔍 EVIDÊNCIAS

### PaySuite Dashboard Transactions:
```
Oct 17, 2025 05:57:14 - MZN 1.00 - Completed - E-Mola
Oct 15, 2025 23:00:47 - MZN 1.00 - Completed - E-Mola
Oct 12, 2025 20:48:49 - MZN 1.00 - Completed - E-Mola
```

### Nosso Banco de Dados:
```
Payment #11: pending, mpesa, 1.00, No webhook event
Payment #10: pending, mpesa, 1.00, No webhook event
Payment #9:  pending, emola, 1.00, No webhook event
```

### Configuração Verificada:
```bash
✓ WEBHOOK_BASE_URL: https://chivacomputer.co.mz
✓ DEBUG: True  ← PROBLEMA!
✓ PAYSUITE_WEBHOOK_SECRET: whsec_cd0a9e1a17e2d5...

📍 Expected webhook URLs:
   Callback: https://chivacomputer.co.mz/api/cart/payments/webhook/
   Return:   https://chivacomputer.co.mz/orders/status
```

---

## 🎯 PLANO DE AÇÃO

### PASSO 1: Corrigir DEBUG Mode (URGENTE)

```bash
# No servidor
cd /home/chiva/chiva-veresao-1
bash scripts/fix_production_config.sh
```

**O que faz:**
- ✅ Backup do .env atual
- ✅ Muda `DEBUG=True` para `DEBUG=False`
- ✅ Reinicia backend
- ✅ Verifica configuração

**Tempo:** 2 minutos

---

### PASSO 2: Testar Webhook Manualmente

```bash
# No servidor
cd /home/chiva/chiva-veresao-1
bash scripts/test_webhook_manual.sh
```

**O que faz:**
- 📤 Simula webhook do PaySuite com assinatura correta
- 📤 Envia evento "payment.paid" para Payment #11
- 📤 Envia evento "payment.failed" para Payment #10
- 🔍 Verifica se status mudou no banco
- 🔍 Verifica se `raw_response` tem `event`

**Resultado Esperado:**
```
✅ Payment #11: status = 'paid', has event = True
✅ Payment #10: status = 'failed', has event = True
```

**Se FUNCIONAR:** Problema é PaySuite não enviando webhooks  
**Se NÃO FUNCIONAR:** Problema é no código de processamento

**Tempo:** 3 minutos

---

### PASSO 3A: SE TESTE MANUAL FUNCIONAR

**Problema confirmado:** PaySuite não está enviando webhooks.

**Possíveis Causas:**

1. **Conta em Sandbox Mode:**
   - PaySuite pode não enviar webhooks em modo sandbox
   - Verificar no dashboard se está em "Production Mode"

2. **Webhook Não Ativado:**
   - Alguns sistemas precisam ativar webhooks separadamente
   - Procurar por toggle/switch "Enable Webhooks"

3. **Webhook Precisa Ser Verificado:**
   - PaySuite pode fazer um GET de verificação primeiro
   - Precisamos implementar endpoint de verificação

4. **Filtro de Eventos:**
   - Verificar se tem opção para escolher quais eventos receber
   - Garantir que "payment.paid" e "payment.failed" estão ativos

**Ações:**
- 📞 Contactar suporte do PaySuite
- 📧 Email: support@paysuite.tech
- ❓ Perguntar: "Por que webhooks não estão sendo enviados?"

---

### PASSO 3B: SE TESTE MANUAL NÃO FUNCIONAR

**Problema confirmado:** Código não está processando webhooks corretamente.

**Ações:**
- 🔍 Verificar logs do Django
- 🐛 Debug do webhook handler
- 🔧 Corrigir validação de assinatura

---

## 💡 SOLUÇÃO TEMPORÁRIA

Enquanto webhooks não funcionam, usar atualização manual:

```bash
# Atualizar Payment #11 para PAID
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.get(id=11)
p.status = 'paid'
p.save()
p.order.status = 'paid' if p.order else None
p.order.save() if p.order else None
print('✅ Payment 11 → PAID')
"

# Atualizar Payment #10 para FAILED
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.get(id=10)
p.status = 'failed'
p.save()
p.order.status = 'failed' if p.order else None
p.order.save() if p.order else None
print('❌ Payment 10 → FAILED')
"
```

---

## 📋 CHECKLIST DE EXECUÇÃO

### Imediato (10 minutos):
- [ ] Executar `fix_production_config.sh`
- [ ] Executar `test_webhook_manual.sh`
- [ ] Verificar se teste manual funcionou
- [ ] Atualizar payments 10 e 11 manualmente

### Curto Prazo (1 hora):
- [ ] Contactar suporte PaySuite
- [ ] Verificar se conta está em Production Mode
- [ ] Verificar se webhooks estão habilitados
- [ ] Verificar logs de webhook no PaySuite Dashboard

### Médio Prazo (1 dia):
- [ ] Implementar endpoint de verificação se necessário
- [ ] Implementar polling como backup
- [ ] Adicionar Django Admin actions para atualização manual
- [ ] Documentar processo de atualização manual

---

## 🔗 LINKS ÚTEIS

- **PaySuite Dashboard:** https://paysuite.tech/dashboard
- **PaySuite Transactions:** https://paysuite.tech/dashboard/transactions
- **PaySuite API Settings:** https://paysuite.tech/dashboard/settings/api
- **Webhook Endpoint:** https://chivacomputer.co.mz/api/cart/payments/webhook/

---

## 📞 CONTACTOS PAYSUITE

Se webhooks continuarem sem funcionar após testes:

**Perguntas para o Suporte:**
1. "Minha conta está em Production Mode ou Sandbox?"
2. "Webhooks estão habilitados na minha conta?"
3. "Existe log de tentativas de webhook no dashboard?"
4. "Preciso fazer verificação de endpoint antes?"
5. "Quais eventos de webhook estão ativos?"

---

## ✅ RESULTADO ESPERADO

Após executar os passos:
1. ✅ `DEBUG=False` em produção
2. ✅ Teste manual confirma que endpoint funciona
3. ✅ Payments 10 e 11 com status correto
4. ✅ Entender se problema é PaySuite ou nosso código
5. ✅ Ter solução temporária (atualização manual) funcionando

---

**Status:** 🔄 Aguardando execução dos testes  
**Próximo Passo:** Executar `fix_production_config.sh` e `test_webhook_manual.sh`
