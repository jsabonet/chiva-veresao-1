# 🧪 GUIA DE TESTE - PRODUCTION MODE

**Data:** 17 de Outubro de 2025  
**Objetivo:** Validar que webhooks funcionam em production mode

---

## ⚠️ ANTES DE COMEÇAR

### Pré-requisitos:
- ✅ Código de webhook corrigido (aceita `payment.paid`)
- ✅ `PAYSUITE_TEST_MODE=production` no `.env`
- ✅ `DEBUG=False` no `.env`
- ✅ Backups criados
- ✅ Script de rollback disponível

### Valores Recomendados para Teste:
- 💰 **1 MZN** - Valor mínimo seguro
- 📱 **M-Pesa ou E-Mola** - Métodos rápidos

---

## 🧪 TESTE 1: Pagamento Bem-Sucedido (1 MZN)

### Objetivo:
Validar que webhook chega automaticamente quando pagamento é concluído.

### Passo a Passo:

#### 1. Preparar Monitoramento (Terminal 1)
```bash
# No servidor
ssh root@157.230.16.193
cd /home/chiva/chiva-veresao-1

# Monitorar logs do backend (webhook)
docker compose logs -f backend | grep -i webhook
```

#### 2. Criar Pedido (Navegador)
```
1. Acesse: https://chivacomputer.co.mz
2. Faça login com sua conta
3. Adicione produto barato ao carrinho (1 MZN se possível)
4. Vá para checkout
5. Preencha dados de entrega
6. Escolha método: M-Pesa ou E-Mola
7. NÃO PAGUE AINDA!
```

#### 3. Anotar ID do Payment (Terminal 2)
```bash
# Em outro terminal no servidor
ssh root@157.230.16.193
cd /home/chiva/chiva-veresao-1

# Ver último payment criado
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.latest('id')
print(f'''
📋 PAYMENT CRIADO:
   ID: {p.id}
   Status: {p.status}
   Amount: {p.amount} MZN
   Method: {p.method}
   Reference: {p.paysuite_reference}
   
🔗 PaySuite ID: {p.raw_response.get('data', {}).get('id', 'N/A') if p.raw_response else 'N/A'}
''')
"
```

**Anotar:** Payment ID = `_____`

#### 4. Realizar Pagamento
```
1. No navegador, clique em "Pagar"
2. Siga instruções do M-Pesa/E-Mola
3. Complete o pagamento (1 MZN)
4. AGUARDE 10-30 segundos
```

#### 5. Observar Logs (Terminal 1)
**O que você DEVE ver:**
```
🔔 Webhook received: event=payment.paid, payment_id=XX, status: pending → paid
✅ Synced order XX status: pending → paid
```

**Se NÃO aparecer nada:**
- ❌ Webhook não chegou
- 🔍 Verificar dashboard PaySuite
- 🔙 Considerar rollback

#### 6. Verificar Status (Terminal 2)
```bash
# Substituir XX pelo ID do payment
docker compose exec backend python manage.py shell -c "
from cart.models import Payment

p = Payment.objects.get(id=XX)
print(f'''
📊 RESULTADO DO TESTE:
   Payment ID: {p.id}
   Status: {p.status}
   Order Status: {p.order.status if p.order else \"N/A\"}
   Has webhook event: {\"event\" in (p.raw_response or {})}
   Webhook event: {p.raw_response.get(\"event\", \"N/A\") if p.raw_response else \"N/A\"}
''')
"
```

### ✅ Critérios de Sucesso:
- ✅ Status mudou de `pending` para `paid`
- ✅ `raw_response` contém `"event": "payment.paid"`
- ✅ Log mostra webhook recebido
- ✅ Order status também `paid`
- ✅ Tempo de atualização < 30 segundos

### ❌ Se Falhar:
```bash
# Reverter para sandbox
cd /home/chiva/chiva-veresao-1
bash scripts/rollback_to_sandbox.sh

# Atualizar payment manualmente
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.get(id=XX)
p.status = 'paid'
p.save()
if p.order:
    p.order.status = 'paid'
    p.order.save()
print('✅ Payment atualizado manualmente')
"
```

---

## 🧪 TESTE 2: Pagamento Cancelado/Falho

### Objetivo:
Validar que webhook de falha também funciona.

### Passo a Passo:

#### 1. Criar Novo Pedido
```
1. Acesse: https://chivacomputer.co.mz
2. Crie pedido de 1 MZN
3. Inicie pagamento M-Pesa/E-Mola
4. CANCELE o pagamento (não complete)
```

#### 2. Aguardar Timeout
```
⏳ Aguarde 5-10 minutos
   (PaySuite pode demorar para marcar como failed)
```

#### 3. Verificar Webhook de Falha
```bash
# Monitorar logs
docker compose logs -f backend | grep -i "payment.failed"

# Verificar status
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.latest('id')
print(f'Status: {p.status}')
print(f'Has failed event: {\"payment.failed\" in str(p.raw_response)}')
"
```

### ✅ Critérios de Sucesso:
- ✅ Status mudou para `failed`
- ✅ Webhook de falha recebido
- ✅ Log mostra `event=payment.failed`

---

## 🧪 TESTE 3: Teste de Carga (Opcional)

### Objetivo:
Validar que múltiplos webhooks funcionam corretamente.

### Passo a Passo:

#### 1. Criar 3-5 Pedidos Seguidos
```
1. Criar pedido 1 (1 MZN)
2. Pagar imediatamente
3. Criar pedido 2 (1 MZN)
4. Pagar imediatamente
5. Repetir mais 1-3 vezes
```

#### 2. Verificar Todos os Webhooks
```bash
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
from django.utils import timezone
from datetime import timedelta

# Payments das últimas 2 horas
recent = timezone.now() - timedelta(hours=2)
payments = Payment.objects.filter(created_at__gte=recent).order_by('-id')

print('📊 PAYMENTS RECENTES:')
print('=' * 60)
for p in payments:
    has_webhook = 'event' in (p.raw_response or {})
    webhook_event = p.raw_response.get('event', 'N/A') if p.raw_response else 'N/A'
    print(f'''
Payment #{p.id}:
   Status: {p.status}
   Method: {p.method}
   Amount: {p.amount}
   Webhook: {\"✅ Yes\" if has_webhook else \"❌ No\"}
   Event: {webhook_event}
''')
print('=' * 60)
"
```

### ✅ Critérios de Sucesso:
- ✅ Todos os payments receberam webhook
- ✅ Nenhum ficou `pending` por mais de 1 minuto
- ✅ Logs mostram todos os webhooks

---

## 📊 RESULTADOS ESPERADOS

### ✅ SUCESSO TOTAL:
```
✓ Teste 1: Pagamento bem-sucedido → webhook em < 30s
✓ Teste 2: Pagamento falho → webhook de falha
✓ Teste 3: Múltiplos pagamentos → todos com webhook
✓ Logs: Todos os eventos registrados
✓ Status: Sempre correto
```

**Ação:** Sistema pronto para produção! 🎉

---

### ⚠️ SUCESSO PARCIAL:
```
✓ Teste 1: OK
✗ Teste 2: Webhook de falha não chegou
✓ Teste 3: Maioria OK
```

**Ação:**
- Investigar webhook de falha
- Implementar fallback para failures
- Continuar monitorando

---

### ❌ FALHA:
```
✗ Teste 1: Webhook não chegou
✗ Teste 2: Webhook não chegou
✗ Teste 3: Nenhum webhook chegou
```

**Ação:** ROLLBACK IMEDIATO!
```bash
cd /home/chiva/chiva-veresao-1
bash scripts/rollback_to_sandbox.sh
```

**Investigar:**
- Dashboard PaySuite → Logs de webhook
- Contactar suporte PaySuite
- Verificar se webhook URL está correta no PaySuite

---

## 🔙 ROLLBACK DE EMERGÊNCIA

### Se algo der errado:
```bash
# No servidor
cd /home/chiva/chiva-veresao-1
bash scripts/rollback_to_sandbox.sh

# Atualizar payments pendentes manualmente
bash scripts/update_payment_manual.sh
```

---

## 📞 SUPORTE PAYSUITE

Se webhooks não funcionarem em production:

**Email:** support@paysuite.tech

**Perguntas:**
1. "Webhooks estão habilitados para minha conta em production?"
2. "Existe log de tentativas de webhook no dashboard?"
3. "Webhook URL está correta: https://chivacomputer.co.mz/api/cart/payments/webhook/"
4. "Quais eventos estão configurados?"

---

## 📋 CHECKLIST DE TESTE

### Antes do Teste:
- [ ] Código de webhook corrigido deployado
- [ ] `PAYSUITE_TEST_MODE=production`
- [ ] `DEBUG=False`
- [ ] Backups criados
- [ ] Terminal com logs aberto
- [ ] Terminal para comandos aberto

### Durante o Teste:
- [ ] Teste 1: Pagamento 1 MZN bem-sucedido
- [ ] Webhook chegou em < 30s
- [ ] Status atualizado corretamente
- [ ] Logs registraram evento
- [ ] Frontend mostra status correto

### Após o Teste:
- [ ] Todos os critérios de sucesso atendidos?
- [ ] Sistema funcionando como esperado?
- [ ] Documentar resultados
- [ ] Se OK: Anunciar produção ativa ✅
- [ ] Se NOK: Executar rollback ❌

---

## 🎯 PRÓXIMOS PASSOS

### Se Testes Passarem:
1. ✅ **Anunciar:** Sistema em produção
2. 📚 **Documentar:** Processo de deployment
3. 🎓 **Treinar:** Equipe de suporte
4. 📊 **Monitorar:** Primeiros dias de produção

### Se Testes Falharem:
1. 🔙 **Rollback:** Voltar para sandbox
2. 🔍 **Investigar:** Por que falhou
3. 📞 **Contactar:** Suporte PaySuite
4. 🛠️ **Corrigir:** Problema identificado
5. 🔁 **Repetir:** Testes até sucesso

---

**Boa sorte! 🍀**  
**Qualquer dúvida, consulte a documentação ou contacte o suporte.**
