# 🎯 COMANDOS FINAIS - COPIE E COLE NO SERVIDOR

## ✅ SITUAÇÃO ATUAL

Os testes confirmaram:
- ✅ Webhook endpoint está acessível externamente
- ✅ HTTPS funcionando com certificado SSL válido
- ✅ Backend respondendo corretamente
- ❌ **FALTA:** Adicionar `WEBHOOK_BASE_URL` ao `.env`

---

## 🔧 PASSO 1: ADICIONAR WEBHOOK_BASE_URL

### Opção A: Comando Rápido (Recomendado)
```bash
echo "" >> .env && \
echo "# Webhook URL for PaySuite callbacks" >> .env && \
echo "WEBHOOK_BASE_URL=https://chivacomputer.co.mz" >> .env && \
echo "✅ WEBHOOK_BASE_URL adicionado!"
```

### Opção B: Editar Manualmente
```bash
nano .env
```

**Adicionar no final do arquivo:**
```bash
# Webhook URL for PaySuite callbacks
WEBHOOK_BASE_URL=https://chivacomputer.co.mz
```

**Salvar:** Ctrl+X → Y → Enter

### Opção C: Script Automático
```bash
bash scripts/add_webhook_url.sh
```

---

## 🔄 PASSO 2: REINICIAR BACKEND

```bash
docker compose restart backend
```

**Aguardar 5-10 segundos...**

---

## 🔍 PASSO 3: VERIFICAR CONFIGURAÇÃO

```bash
docker compose exec backend python -c "from django.conf import settings; import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings'); import django; django.setup(); print('WEBHOOK_BASE_URL:', settings.WEBHOOK_BASE_URL)"
```

**Esperado:**
```
WEBHOOK_BASE_URL: https://chivacomputer.co.mz
```

---

## 🌐 PASSO 4: ATUALIZAR DASHBOARD PAYSUITE

### 1. Acessar Dashboard
- URL: https://paysuite.tech/dashboard
- Fazer login

### 2. Encontrar Webhooks
Procurar por uma dessas opções:
- **Settings** → **Webhooks**
- **API** → **Webhooks**
- **Developers** → **Webhooks**
- **Configurações** → **Webhooks**

### 3. Atualizar URL

**URL Atual (localhost):**
```
❌ http://127.0.0.1:8000/api/cart/payments/webhook/
```

**URL Nova (produção):**
```
✅ https://chivacomputer.co.mz/api/cart/payments/webhook/
```

### 4. Salvar Configurações

Clicar em **Save** ou **Salvar**

### 5. Testar (Opcional)
Se houver botão "Test Webhook", clicar para enviar teste.

---

## 🧪 PASSO 5: TESTE END-TO-END

### 1. Monitorar Logs
```bash
docker compose logs -f backend | grep -E "(Webhook|🔔|✅)"
```

### 2. Fazer Pagamento de Teste
- Abrir site: https://chivacomputer.co.mz
- Adicionar produto ao carrinho
- Fazer checkout
- Selecionar M-Pesa ou e-Mola
- Completar pagamento (pode usar valor baixo)

### 3. Aguardar 3-10 Segundos

### 4. Verificar Logs

**Esperado nos logs:**
```
🔔 Webhook received: event=payment.success, payment_id=11, status: pending → paid
✅ Synced order 11 status: pending → paid
📦 Order ORD000011 status updated: pending → paid, stock reduced
```

### 5. Verificar Frontend

Status deve atualizar automaticamente:
```
✅ Pagamento Aprovado!
Seu pedido foi confirmado...
```

---

## 📋 RESUMO DOS COMANDOS (COPIE TUDO)

```bash
# 1. Adicionar WEBHOOK_BASE_URL ao .env
echo "" >> .env && \
echo "# Webhook URL for PaySuite callbacks" >> .env && \
echo "WEBHOOK_BASE_URL=https://chivacomputer.co.mz" >> .env && \
echo "✅ Adicionado!"

# 2. Reiniciar backend
docker compose restart backend

# 3. Aguardar 10 segundos
sleep 10

# 4. Verificar configuração
docker compose exec backend python -c "from django.conf import settings; import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings'); import django; django.setup(); print('WEBHOOK_BASE_URL:', settings.WEBHOOK_BASE_URL)"

# 5. Monitorar logs (deixar rodando)
docker compose logs -f backend | grep -E "(Webhook|🔔|✅)"
```

**Depois:**
1. Atualizar URL no dashboard do PaySuite
2. Fazer pagamento de teste
3. Verificar logs acima
4. Confirmar status atualiza automaticamente! 🎉

---

## ✅ CHECKLIST FINAL

- [ ] ✅ Executei teste do webhook (passou!)
- [ ] ✅ Adicionei `WEBHOOK_BASE_URL` ao `.env`
- [ ] ✅ Reiniciei o backend
- [ ] ✅ Verifiquei configuração (mostra chivacomputer.co.mz)
- [ ] ✅ Acessei dashboard do PaySuite
- [ ] ✅ Atualizei webhook URL no dashboard
- [ ] ✅ Salvei as configurações
- [ ] ✅ Fiz pagamento de teste
- [ ] ✅ Vi webhook chegando nos logs
- [ ] ✅ Status atualizou automaticamente no frontend

---

## 🆘 SE ALGO DER ERRADO

### Webhook não chega após atualizar dashboard
```bash
# Verificar se backend recebeu a configuração
docker compose exec backend python -c "from django.conf import settings; import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings'); import django; django.setup(); print('WEBHOOK_BASE_URL:', settings.WEBHOOK_BASE_URL)"

# Deve mostrar: https://chivacomputer.co.mz
# Se mostrar localhost, reiniciar novamente:
docker compose restart backend
```

### Status continua pending
```bash
# Ver últimos 100 logs
docker compose logs backend | tail -100

# Procurar por erros
docker compose logs backend | grep -i error
```

### Payment não encontrado
```bash
# Verificar payment no banco
docker compose exec backend python manage.py shell -c "from cart.models import Payment; p = Payment.objects.last(); print(f'ID: {p.id}, Status: {p.status}, Ref: {p.paysuite_reference}')"
```

---

**Tempo Total:** ~5 minutos  
**Dificuldade:** Fácil  
**Impacto:** 🔥 RESOLVE 100% DOS PROBLEMAS DE STATUS!
