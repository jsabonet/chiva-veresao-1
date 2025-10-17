# 🚀 MIGRAÇÃO PARA PRODUCTION - GUIA RÁPIDO

**Data:** 17 de Outubro de 2025  
**Status:** Pronto para migração

---

## ⚡ EXECUÇÃO RÁPIDA (15 minutos)

### 1️⃣ **Deploy do Código Corrigido** (5 min)
```bash
# No servidor
ssh root@157.230.16.193
cd /home/chiva/chiva-veresao-1
git pull origin main
docker compose restart backend
```

### 2️⃣ **Testar Bug Fix** (3 min)
```bash
bash scripts/reset_and_test_webhook.sh
```
**Verificar:** Payment #11 = `paid` ✅

### 3️⃣ **Migrar para Production** (5 min)
```bash
bash scripts/migrate_to_production.sh
```
**Confirmar:** Digite `yes` quando solicitado

### 4️⃣ **Testar Pagamento Real** (2 min)
Seguir: `GUIA_TESTE_PRODUCTION.md` → Teste 1

---

## 📋 O QUE O SCRIPT FAZ:

```bash
bash scripts/migrate_to_production.sh
```

### Automático:
1. ✅ **Backups:**
   - `.env` → `.env.sandbox.backup.TIMESTAMP`
   - Database → `backup_db_TIMESTAMP.json`
   - Payments → `backup_payments_TIMESTAMP.json`

2. ✅ **Verificações:**
   - Modo atual (sandbox)
   - Payments pendentes
   - Confirmação do usuário

3. ✅ **Atualização:**
   - `PAYSUITE_TEST_MODE=production`
   - `DEBUG=False`
   - Reiniciar containers

4. ✅ **Validação:**
   - Django configurado corretamente
   - Instruções de teste

---

## 🧪 TESTE DE VALIDAÇÃO

### Teste Mínimo (OBRIGATÓRIO):
```
1. Criar pedido de 1 MZN
2. Pagar via M-Pesa/E-Mola
3. Aguardar 30 segundos
4. Verificar se status mudou para 'paid'
```

**Monitorar logs:**
```bash
# Terminal 1: Logs de webhook
docker compose logs -f backend | grep -i webhook

# Terminal 2: Verificar payment
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.latest('id')
print(f'Payment #{p.id}: {p.status}')
print(f'Has webhook: {\"event\" in (p.raw_response or {})}')
"
```

### ✅ Sucesso Se:
- Status muda de `pending` → `paid` em < 30s
- Logs mostram: `🔔 Webhook received: event=payment.paid`
- `raw_response` contém `"event": "payment.paid"`

### ❌ Falha Se:
- Status continua `pending` após 1 minuto
- Nenhum log de webhook aparece
- `raw_response` não tem `event`

---

## 🔙 ROLLBACK DE EMERGÊNCIA

Se teste falhar:

```bash
bash scripts/rollback_to_sandbox.sh
```

**O script:**
1. Lista backups disponíveis
2. Restaura `.env` do sandbox
3. Reinicia containers
4. Confirma rollback

**Atualizar payment manualmente:**
```bash
bash scripts/update_payment_manual.sh
```

---

## 📊 CHECKLIST COMPLETO

### Antes da Migração:
- [x] Código de bug corrigido (aceita `payment.paid`)
- [x] Scripts de migração criados
- [x] Script de rollback criado
- [x] Guia de teste criado
- [ ] Deploy do código no servidor
- [ ] Teste do bug fix validado

### Durante a Migração:
- [ ] `git pull origin main`
- [ ] `bash scripts/migrate_to_production.sh`
- [ ] Confirmar com `yes`
- [ ] Aguardar backups e reinício
- [ ] Verificar configuração Django

### Após a Migração:
- [ ] Teste 1: Pagamento 1 MZN
- [ ] Webhook chegou em < 30s
- [ ] Status atualizado corretamente
- [ ] Logs registraram evento
- [ ] Frontend mostra status correto

### Se Tudo OK:
- [ ] Sistema em produção ✅
- [ ] Anunciar para equipe
- [ ] Monitorar primeiros pagamentos
- [ ] Documentar processo

### Se Algo Falhar:
- [ ] `bash scripts/rollback_to_sandbox.sh`
- [ ] Contactar suporte PaySuite
- [ ] Investigar logs
- [ ] Corrigir problema
- [ ] Repetir migração

---

## 🎯 COMANDOS ESSENCIAIS

### Migração:
```bash
cd /home/chiva/chiva-veresao-1
git pull origin main
bash scripts/migrate_to_production.sh
```

### Teste:
```bash
# Logs
docker compose logs -f backend | grep -i webhook

# Status
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.latest('id')
print(f'#{p.id}: {p.status} | Has webhook: {\"event\" in (p.raw_response or {})}')
"
```

### Rollback:
```bash
bash scripts/rollback_to_sandbox.sh
```

### Atualização Manual (se necessário):
```bash
bash scripts/update_payment_manual.sh
```

---

## 📞 SUPORTE

### PaySuite:
- Email: support@paysuite.tech
- Dashboard: https://paysuite.tech/dashboard
- Perguntar: "Webhooks em production estão habilitados?"

### Problemas Comuns:

**1. Webhook não chega:**
- Verificar dashboard PaySuite → Logs de webhook
- Confirmar URL: `https://chivacomputer.co.mz/api/cart/payments/webhook/`
- Verificar se webhook está habilitado
- Contactar suporte

**2. Status não atualiza:**
- Verificar logs: `docker compose logs backend | grep webhook`
- Verificar `raw_response` do payment
- Verificar se evento é `payment.paid` (não `payment.success`)

**3. Erro no código:**
- Verificar logs de erro: `docker compose logs backend | tail -100`
- Reverter para sandbox
- Corrigir bug
- Repetir migração

---

## 🎉 RESULTADO ESPERADO

### Após Migração Bem-Sucedida:

```
✅ PAYSUITE_TEST_MODE=production
✅ DEBUG=False
✅ Backups criados
✅ Containers reiniciados
✅ Django configurado
✅ Teste de 1 MZN passou
✅ Webhook chegou em < 30s
✅ Status atualizado automaticamente
✅ Sistema pronto para produção! 🎊
```

### Próximos Passos:
1. Monitorar primeiros pagamentos reais
2. Documentar processo para equipe
3. Treinar suporte para problemas
4. Celebrar! 🎉

---

## 📁 ARQUIVOS IMPORTANTES

```
scripts/
  ├── migrate_to_production.sh    ← Migração para production
  ├── rollback_to_sandbox.sh      ← Rollback para sandbox
  ├── reset_and_test_webhook.sh   ← Testar bug fix
  └── update_payment_manual.sh    ← Atualização manual

GUIA_TESTE_PRODUCTION.md          ← Guia completo de testes
CAUSA_RAIZ_MODO_SANDBOX.md        ← Análise do problema
BUG_WEBHOOK_EVENT_NAMES.md        ← Documentação do bug
```

---

## ⚠️ AVISOS IMPORTANTES

1. **APÓS MIGRAÇÃO:**
   - ⚠️ Pagamentos cobram dinheiro REAL
   - ⚠️ Não testar indiscriminadamente
   - ⚠️ Primeiro teste com 1 MZN apenas

2. **BACKUPS:**
   - ✅ Criados automaticamente
   - ✅ Timestampados
   - ✅ Mantidos para rollback

3. **ROLLBACK:**
   - ✅ Sempre disponível
   - ✅ Script automático
   - ✅ Restaura sandbox

4. **SUPORTE:**
   - 📞 PaySuite disponível para dúvidas
   - 📧 Email de suporte pronto
   - 📚 Documentação completa

---

**Boa sorte com a migração! 🚀**
