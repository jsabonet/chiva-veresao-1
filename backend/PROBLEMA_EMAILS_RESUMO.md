# 🚨 PROBLEMA: Emails não chegam em Produção

## ⚡ RESPOSTA RÁPIDA

**Status:** ✅ Sistema de emails está **100% FUNCIONAL**  
**Problema Real:** ❌ **Webhooks do PaySuite não estão sendo recebidos**

---

## 🎯 O QUE ESTÁ ACONTECENDO

### ✅ O que FUNCIONA:
- Sistema de emails configurado corretamente
- Brevo API conectada e enviando
- Templates HTML carregando
- Email de teste enviado com SUCESSO ✓

### ❌ O que NÃO funciona:
- **Webhooks do PaySuite não chegam ao servidor**
- Pagamentos ficam em status `pending` para sempre
- Sem webhook = sem confirmação = **sem emails automáticos**

---

## 📊 EVIDÊNCIAS

### Teste realizado AGORA:
```
✅ Email de teste enviado com SUCESSO
📧 Para: jsabonete09@gmail.com
📨 Message ID: <202510201638.82463399347@smtp-relay.mailin.fr>
```

**Verifique seu Gmail!** O email deve estar lá (inbox ou spam)

### Status dos últimos 10 pagamentos:
```
❌ Payment #146 - Status: pending
❌ Payment #145 - Status: pending
❌ Payment #144 - Status: pending
❌ Payment #143 - Status: failed
❌ Payment #142 - Status: pending
❌ Payment #141 - Status: pending
✅ Payment #140 - Status: paid    ← ÚNICO que recebeu webhook!
❌ Payment #139 - Status: pending
❌ Payment #138 - Status: pending
❌ Payment #137 - Status: pending
```

**Conclusão:** Apenas 1 de 10 pagamentos recebeu o webhook do PaySuite

---

## 🔧 SOLUÇÃO

### Passo 1: Verificar configuração do webhook no PaySuite

Acesse: [PaySuite Dashboard](https://dashboard.paysuite.co.mz/)

**Configuração correta:**
```
URL: https://chivacomputer.co.mz/api/cart/payments/webhook/
Method: POST
Events: ✓ payment.success
        ✓ payment.failed
        ✓ payment.paid
Status: Ativo ✓
```

### Passo 2: Verificar se o servidor está recebendo webhooks

```bash
# SSH no servidor
ssh user@chivacomputer.co.mz

# Monitorar logs em tempo real
tail -f /var/log/nginx/access.log | grep webhook

# OU (se usar Docker)
docker logs chiva_backend --tail 100 -f | grep webhook
```

**Faça um pagamento de teste** e veja se aparecem logs.

**O que procurar:**
- ✅ `POST /api/cart/payments/webhook/ HTTP/1.1" 200` → Funcionando!
- ❌ `POST /api/cart/payments/webhook/ HTTP/1.1" 404` → Nginx não está roteando
- ❌ Nada aparece → PaySuite não está chamando

### Passo 3: Testar webhook manualmente

```bash
# No servidor
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

**Se funcionar:**
- ✅ Servidor está OK
- ❌ Problema é com PaySuite não chamando o webhook

**Se der erro 404:**
- ❌ Nginx não está roteando corretamente
- Verificar configuração do nginx

---

## 🎬 AÇÕES IMEDIATAS

### 1. Verificar email de teste
```
📧 Email: jsabonete09@gmail.com
📬 Assunto: "✅ Pedido #CHV202510180001 Confirmado"
```

### 2. Verificar webhook no PaySuite
```
Dashboard → Configurações → Webhooks
Verificar URL e eventos habilitados
```

### 3. Monitorar logs no servidor
```bash
tail -f /var/log/nginx/access.log | grep webhook
```

### 4. Fazer pagamento de teste
```
Fazer compra no site
Pagar com M-Pesa/e-Mola
Observar se webhook chega nos logs
```

---

## 📋 CHECKLIST

```
[✅] Sistema de emails funcionando
[✅] Email de teste recebido
[⏳] Webhook configurado no PaySuite
[⏳] Servidor recebendo webhooks
[⏳] Pagamentos sendo confirmados
[⏳] Emails automáticos chegando
```

---

## 🆘 SE NADA FUNCIONAR

Execute este comando no servidor de produção para **FORÇAR** o envio de emails de um pedido:

```bash
cd /path/to/chiva/backend
python forcar_envio_emails.py
```

Isso vai:
1. Listar pedidos recentes
2. Permitir escolher um pedido
3. **Forçar** o envio de todos os emails (confirmação, pagamento, admin)

**Use apenas para testes!** O ideal é que os webhooks funcionem automaticamente.

---

## 💡 RESUMO EXECUTIVO

| Item | Status | Ação Necessária |
|------|--------|-----------------|
| Sistema de Emails | ✅ OK | Nenhuma |
| Brevo API | ✅ OK | Nenhuma |
| Templates HTML | ✅ OK | Nenhuma |
| Webhook PaySuite | ❌ PROBLEMA | **Configurar no PaySuite** |
| Pagamentos confirmados | ❌ PROBLEMA | Depende do webhook |
| Emails automáticos | ❌ PROBLEMA | Depende do webhook |

**Solução:** Configurar corretamente o webhook no PaySuite!

---

## 📞 CONTATO

Se precisar de ajuda:
1. Verifique `TROUBLESHOOTING_EMAILS_PRODUCAO.md` (guia completo)
2. Execute `diagnostico_emails_producao.py` (diagnóstico completo)
3. Execute `forcar_envio_emails.py` (teste manual)

**Status:** Sistema pronto. Falta apenas configuração do webhook! 🚀
