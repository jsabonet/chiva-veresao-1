# 🔍 DIAGNÓSTICO: Por que não estou recebendo emails?

## ✅ RESULTADO DO DIAGNÓSTICO

**Data:** 20 de Outubro de 2025  
**Status:** Sistema de emails funcionando ✅ | Problema identificado: Webhooks ❌

---

## 📊 O QUE DESCOBRIMOS

### ✅ Sistema de Emails ESTÁ FUNCIONANDO!

```
✅ Email de teste enviado com SUCESSO
📧 Destinatário: jsabonete09@gmail.com
📨 Message ID: <202510201638.82463399347@smtp-relay.mailin.fr>
```

**Verifique seu Gmail AGORA** - você deve ter recebido um email de teste!

### ❌ PROBLEMA REAL: Pagamentos não estão sendo confirmados

```
📊 STATUS DOS ÚLTIMOS PAGAMENTOS:

❌ Payment #146 - Status: pending - Order: CHV202510180001
❌ Payment #145 - Status: pending - Order: CHV202510170002
❌ Payment #144 - Status: pending - Order: CHV202510170001
❌ Payment #143 - Status: failed  - Order: CHV202510160003
❌ Payment #142 - Status: pending - Order: CHV202510160002
❌ Payment #141 - Status: pending - Order: CHV202510160001
✅ Payment #140 - Status: paid    - Order: CHV202510150003 ← ÚNICO QUE FUNCIONOU!
❌ Payment #139 - Status: pending - Order: CHV202510150002
❌ Payment #138 - Status: pending - Order: CHV202510150001
```

**Conclusão:** Apenas 1 pagamento (ID #140) foi confirmado e recebeu o webhook `payment.success`

---

## 🎯 POR QUE NÃO RECEBO EMAILS?

### O sistema de emails SÓ envia quando:

1. ✅ Payment status = `paid` (confirmado)
2. ✅ Webhook do PaySuite é recebido
3. ✅ Order status é atualizado para `paid`

**Se os pagamentos ficam em `pending`, os emails NÃO são enviados!**

---

## 🔧 COMO RESOLVER

### 1️⃣ VERIFICAR WEBHOOK DO PAYSUITE

O webhook deve estar configurado no PaySuite para:

```
URL: https://chivacomputer.co.mz/api/cart/payments/webhook/
Method: POST
Events: payment.success, payment.failed
```

#### Como verificar:

```bash
# SSH no servidor
ssh user@chivacomputer.co.mz

# Ver logs do nginx
tail -f /var/log/nginx/access.log | grep webhook

# Ver logs do Django/Docker
docker logs chiva_backend --tail 100 | grep webhook
```

**O que procurar:**
- ✅ Requisições POST chegando em `/api/cart/payments/webhook/`
- ✅ Logs: `"🔔 Webhook received: event=payment.success"`
- ❌ Erros 404, 500 ou timeout

---

### 2️⃣ VERIFICAR CONFIGURAÇÃO NO PAYSUITE

Acesse o painel do PaySuite e verifique:

1. **Webhook URL está correta?**
   - ✅ `https://chivacomputer.co.mz/api/cart/payments/webhook/`
   - ❌ `http://` (sem SSL)
   - ❌ URL errada ou localhost

2. **Eventos estão habilitados?**
   - ✅ `payment.success` ✓
   - ✅ `payment.failed` ✓
   - ✅ `payment.paid` ✓

3. **SSL válido?**
   - Webhook precisa de HTTPS válido
   - Certificado não pode estar expirado

---

### 3️⃣ TESTAR WEBHOOK MANUALMENTE

Você pode simular um webhook para testar:

```bash
# No servidor de produção, execute:
cd /path/to/chiva/backend

# Enviar webhook de teste
curl -X POST https://chivacomputer.co.mz/api/cart/payments/webhook/ \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.success",
    "data": {
      "id": "146",
      "reference": "REF146",
      "amount": 1000,
      "status": "paid"
    }
  }'
```

**Resultado esperado:**
- ✅ Status 200 OK
- ✅ Payment #146 muda de `pending` para `paid`
- ✅ 3 emails enviados (confirmação, pagamento aprovado, notificação admin)

---

### 4️⃣ VERIFICAR FIREWALL/NGINX

O servidor pode estar bloqueando webhooks do PaySuite:

```bash
# Verificar se a rota existe
curl https://chivacomputer.co.mz/api/cart/payments/webhook/ \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'

# Deve retornar algo (mesmo que erro 400)
# Se retornar 404 → Nginx não está roteando corretamente
```

**Configuração correta do Nginx:**

```nginx
location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

### 5️⃣ ALTERNATIVA: POLLING MANUAL

Se o webhook não funcionar, você pode forçar a verificação manual:

```python
# No servidor de produção
cd /path/to/chiva/backend
python manage.py shell

# Execute:
from cart.models import Payment
from cart.views import check_payment_status_with_paysuite

# Pegar o último payment pendente
payment = Payment.objects.filter(status='pending').order_by('-created_at').first()
print(f"Payment ID: {payment.id}, Status: {payment.status}")

# Forçar verificação com PaySuite
check_payment_status_with_paysuite(payment)

# Verificar se mudou
payment.refresh_from_db()
print(f"Novo status: {payment.status}")
```

---

## 🎯 AÇÃO IMEDIATA

### Passo 1: Verificar se o email de teste chegou

```
📧 Email: jsabonete09@gmail.com
📬 Verifique: Inbox ou Spam
🔍 Assunto: "✅ Pedido #CHV202510180001 Confirmado"
```

**Se chegou:** ✅ Sistema de emails OK!  
**Se não chegou:** Espere 5 minutos e verifique spam

### Passo 2: Verificar logs do webhook em produção

```bash
# SSH no servidor
ssh user@chivacomputer.co.mz

# Monitorar webhooks em tempo real
tail -f /var/log/nginx/access.log | grep webhook
```

**Faça um pagamento de teste e observe:**
- ✅ Webhook chega? → Logs aparecem?
- ❌ Nada acontece? → PaySuite não está chamando

### Passo 3: Verificar configuração do PaySuite

1. Acesse: [PaySuite Dashboard](https://dashboard.paysuite.co.mz/)
2. Vá em: **Configurações → Webhooks**
3. Verifique:
   - ✅ URL: `https://chivacomputer.co.mz/api/cart/payments/webhook/`
   - ✅ Eventos: `payment.success`, `payment.failed`
   - ✅ Status: Ativo ✓

---

## 📋 CHECKLIST DE TROUBLESHOOTING

```
[ ] ✅ Email de teste recebido (sistema de emails OK)
[ ] ⏳ Verificar logs do webhook no servidor
[ ] ⏳ Confirmar URL do webhook no PaySuite
[ ] ⏳ Testar webhook manualmente com curl
[ ] ⏳ Verificar se nginx está roteando /api/cart/payments/webhook/
[ ] ⏳ Verificar certificado SSL válido
[ ] ⏳ Fazer pagamento de teste e monitorar logs
```

---

## 💡 RESUMO

### ✅ O QUE ESTÁ BOM:
- Sistema de emails funcionando perfeitamente
- Templates HTML carregando corretamente
- Brevo API conectada e enviando emails
- Configurações do Django corretas

### ❌ O QUE ESTÁ RUIM:
- Webhooks do PaySuite não estão chegando
- Pagamentos ficam em `pending` indefinidamente
- Sem webhook = sem confirmação = sem emails

### 🎯 SOLUÇÃO:
**Configurar corretamente o webhook do PaySuite**

URL: `https://chivacomputer.co.mz/api/cart/payments/webhook/`

---

## 📞 PRÓXIMOS PASSOS

1. ✅ **Confirmar recebimento do email de teste**
2. 🔍 **Verificar logs do webhook no servidor**
3. 🔧 **Corrigir configuração do PaySuite**
4. ✅ **Fazer pagamento de teste**
5. 🎉 **Receber os 3 emails automáticos!**

---

**Status Final:** Sistema pronto, faltando apenas configuração do webhook! 🚀
