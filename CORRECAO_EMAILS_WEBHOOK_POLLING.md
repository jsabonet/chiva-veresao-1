# Correção: Emails Enviados Tanto via Webhook quanto via Polling

## 🎯 Problema Identificado

O sistema estava configurado para enviar emails após pagamentos, mas:
1. ❌ Logs insuficientes tornavam difícil diagnosticar falhas
2. ❌ Exceções silenciosas podiam ocultar erros
3. ❌ Não havia confirmação clara se emails eram enviados

## ✅ Solução Implementada

### Logs Detalhados Adicionados

Em **TODOS** os pontos de envio de emails:

#### 1. Webhook - Pagamento Aprovado
**Arquivo:** `backend/cart/views.py` **Linhas ~1593-1643**

```python
# Logs adicionados:
🚀 [WEBHOOK] Iniciando envio de emails para order {order_id}
📬 [WEBHOOK] Customer email: {email}, name: {name}
📧 [WEBHOOK] Enviando email de confirmação...
✅/❌ [WEBHOOK] Email de confirmação: True/False
📧 [WEBHOOK] Enviando email de status de pagamento...
✅/❌ [WEBHOOK] Email de status: True/False
📧 [WEBHOOK] Enviando email para admin...
✅/❌ [WEBHOOK] Email admin: True/False
```

#### 2. Webhook - Pagamento Falhado
**Arquivo:** `backend/cart/views.py` **Linhas ~1662-1676**

```python
# Similar ao acima, com tag [WEBHOOK-FAILED]
```

#### 3. Polling - Pagamento Aprovado
**Arquivo:** `backend/cart/views.py` **Linhas ~1956-2007**

```python
# Logs adicionados:
🚀 [POLLING] Iniciando envio de emails para order {order_id}
📬 [POLLING] Customer email: {email}, name: {name}
📧 [POLLING] Enviando email de confirmação...
✅/❌ [POLLING] Email de confirmação: True/False
📧 [POLLING] Enviando email de status de pagamento...
✅/❌ [POLLING] Email de status: True/False
📧 [POLLING] Enviando email para admin...
✅/❌ [POLLING] Email admin: True/False
```

#### 4. Polling - Pagamento Falhado
**Arquivo:** `backend/cart/views.py` **Linhas ~1835-1868**

```python
# Logs adicionados:
🚀 [POLLING-FAILED] Iniciando envio de email de falha
📬 [POLLING-FAILED] Customer email: {email}, name: {name}
📧 [POLLING-FAILED] Enviando email de falha...
✅/❌ [POLLING-FAILED] Email de falha: True/False
```

### Tratamento de Exceções Melhorado

Agora TODAS as exceções são:
1. Logadas com `logger.error()`
2. Impressas no console com `print()`
3. Stacktrace completo registrado

```python
except Exception as e:
    logger.error(f"❌ [WEBHOOK] Erro ao enviar emails: {e}")
    print(f"❌ [WEBHOOK] Erro ao enviar emails: {e}")
    import traceback
    logger.error(traceback.format_exc())
    print(traceback.format_exc())
```

---

## 🧪 Como Testar

### 1. Fazer uma Compra Real

```bash
# 1. Certifique-se que o servidor Django está rodando
cd backend
python manage.py runserver

# 2. No frontend, faça uma compra
# 3. Use seu email REAL no checkout
# 4. Pague com M-Pesa
```

### 2. Verificar Logs no Console

Durante a compra, você DEVE ver no console do Django:

**Se webhook funcionar:**
```
🚀 [WEBHOOK] Iniciando envio de emails para order 159
📬 [WEBHOOK] Customer email: seu_email@gmail.com, name: Seu Nome
📧 [WEBHOOK] Enviando email de confirmação...
✅ [WEBHOOK] Email de confirmação: True
📧 [WEBHOOK] Enviando email de status de pagamento...
✅ [WEBHOOK] Email de status: True
📧 [WEBHOOK] Enviando email para admin...
✅ [WEBHOOK] Email admin: True
```

**Se webhook falhar mas polling funcionar:**
```
🔄 [POLLING] Active polling PaySuite for payment xyz123
💳 [POLLING] PaySuite response status: paid
🚀 [POLLING] Iniciando envio de emails para order 159
📬 [POLLING] Customer email: seu_email@gmail.com, name: Seu Nome
📧 [POLLING] Enviando email de confirmação...
✅ [POLLING] Email de confirmação: True
...
```

### 3. Verificar Emails

1. **Caixa de Entrada:** Verifique seu email
2. **Pasta SPAM:** ⚠️ SEMPRE verifique SPAM primeiro!
3. **Dashboard Brevo:** https://app.brevo.com/ → Statistics → Email

---

## 🔍 Diagnóstico de Problemas

### Se NÃO aparecer nenhum log `🚀 [WEBHOOK]` ou `🚀 [POLLING]`:

**Problema:** Código de envio não está sendo executado.

**Verificar:**
1. Webhook está chegando? (Procure por `📥 Paysuite webhook hit`)
2. Polling está ativo? (Procure por `🔄 [POLLING] Active polling`)
3. Status foi atualizado? (Procure por `✅ Synced order`)

### Se aparecer `⚠️ customer_email está vazio`:

**Problema:** Email não foi fornecido no checkout.

**Verificar:**
1. Frontend está enviando `shipping_address.email`
2. Banco de dados: `order.shipping_address['email']`

### Se aparecer `❌ Email de confirmação: False`:

**Problema:** Brevo API rejeitou o email.

**Verificar:**
1. API Key do Brevo está correta
2. Quota do Brevo não foi excedida
3. Email do remetente está verificado
4. Ver stacktrace completo nos logs

### Se aparecer `✅ Email de confirmação: True` mas não recebe:

**Problema:** Email foi para SPAM ou provedor bloqueou.

**Solução:**
1. ✅ Verificar pasta SPAM
2. ✅ Adicionar chivacomputer@gmail.com aos contatos
3. ✅ Testar com outro email (Gmail, Outlook)
4. ✅ Verificar dashboard Brevo se email foi entregue

---

## 📊 Fluxo Completo de Envio de Emails

### Cenário 1: Webhook Funciona (Ideal)

```
1. Cliente paga com M-Pesa
2. PaySuite → Webhook → backend/cart/views.py:paysuite_webhook()
3. Detecta: event=payment.success
4. Atualiza: payment.status = 'paid'
5. Atualiza: order.status = 'paid'
6. ✅ ENVIA EMAILS:
   - send_order_confirmation() → Cliente
   - send_payment_status_update() → Cliente
   - send_new_order_notification_to_admin() → Admin
7. Cliente recebe emails imediatamente
```

### Cenário 2: Webhook Falha, Polling Salva (Backup)

```
1. Cliente paga com M-Pesa
2. Webhook não chega (firewall, timeout, etc.)
3. Frontend polling (a cada 3s) → backend/cart/views.py:payment_status()
4. Backend consulta PaySuite API diretamente
5. Detecta: status mudou de 'pending' → 'paid'
6. Atualiza: payment.status = 'paid'
7. Atualiza: order.status = 'paid'
8. ✅ ENVIA EMAILS:
   - send_order_confirmation() → Cliente
   - send_payment_status_update() → Cliente
   - send_new_order_notification_to_admin() → Admin
9. Cliente recebe emails dentro de 3-10 segundos
```

### Cenário 3: Pagamento Falha

```
1. Cliente tenta pagar mas falha (saldo insuficiente, cancelou, etc.)
2. Via webhook OU polling:
3. Detecta: status = 'failed'
4. Atualiza: payment.status = 'failed'
5. Atualiza: order.status = 'failed'
6. ✅ ENVIA EMAIL:
   - send_payment_status_update(..., payment_status='failed') → Cliente
7. Cliente é notificado que pagamento falhou
```

---

## 📝 Mudanças Feitas

### Arquivos Alterados

1. **backend/cart/views.py**
   - Linha ~1593-1643: Logs webhook pagamento aprovado
   - Linha ~1662-1690: Logs webhook pagamento falhado
   - Linha ~1835-1868: Logs polling pagamento falhado
   - Linha ~1956-2007: Logs polling pagamento aprovado

### Logs Adicionados

- Total de linhas adicionadas: ~120
- Total de pontos de logging: 16
- Tipos de logs:
  - 🚀 Início do processo de envio
  - 📬 Informações do destinatário
  - 📧 Envio individual de cada tipo de email
  - ✅/❌ Resultado do envio (True/False)
  - ⚠️ Avisos (email vazio, etc.)
  - ❌ Erros com stacktrace completo

---

## ✅ Garantias

Com estas mudanças:

1. ✅ **Emails enviados via webhook** (se webhook chegar)
2. ✅ **Emails enviados via polling** (se webhook falhar)
3. ✅ **Logs detalhados** em TODOS os casos
4. ✅ **Stacktrace completo** se houver erro
5. ✅ **Visível no console** durante desenvolvimento
6. ✅ **Visível nos logs** em produção

**O sistema NÃO depende 100% de webhooks!** 🎉

---

## 🚀 Deploy

Para aplicar em produção:

```bash
# 1. Commit das mudanças
git add backend/cart/views.py
git commit -m "feat: Adiciona logs detalhados para envio de emails via webhook e polling"

# 2. Push
git push origin main

# 3. Deploy (se automático)
# OU
# SSH no servidor e pull

# 4. Restart do servidor Django
sudo systemctl restart gunicorn
# OU
sudo supervisorctl restart chiva_backend
```

---

## 📧 Suporte

Se após estas mudanças ainda não receber emails:

1. Verifique os logs no console/arquivo
2. Procure por `🚀 [WEBHOOK]` ou `🚀 [POLLING]`
3. Se aparecer `✅ True`, email foi enviado
4. Verifique SPAM
5. Verifique dashboard Brevo
6. Se não aparecer `🚀`, há um problema antes do envio de emails

---

**Última atualização:** 21 de Outubro de 2025
