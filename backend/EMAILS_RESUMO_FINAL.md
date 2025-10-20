# ✅ SISTEMA DE EMAILS - TEMPLATES HTML COMPLETO

## 📧 RESUMO DO QUE FOI CRIADO

### 1. Templates HTML Separados (5 arquivos)
```
backend/cart/email_templates/
├── order_confirmation.html    - Confirmação de pedido
├── payment_status.html         - Status de pagamento (aprovado/pendente/falhou)
├── shipping_update.html        - Pedido enviado
├── cart_recovery.html          - Recuperação de carrinho
└── admin_new_order.html        - Notificação para admin
```

### 2. Email Service V2 (com suporte a templates)
- `email_service_v2.py` - Nova versão que carrega templates HTML
- Método `_load_template()` - Carrega arquivo HTML
- Método `_render_template()` - Substitui variáveis {{VAR}}

### 3. Scripts de Teste
- `test_templates.py` - Testa templates e gera previews HTML
- Gera arquivos `preview_*.html` para visualizar no navegador

### 4. Documentação
- `TEMPLATES_EMAIL_GUIA.md` - Guia completo de uso
- `VERIFICAR_SENDER_EMAIL.md` - Como resolver problema de entrega

---

## 🚀 COMO USAR AGORA

### PASSO 1: Resolver o problema do sender email

**O email não está chegando porque `noreply@chivacomputer.co.mz` não está verificado no Brevo.**

**Solução rápida (para testes):**

1. Edite `backend/.env`:
```env
BREVO_SENDER_EMAIL=jsabonete09@gmail.com
BREVO_SENDER_NAME=Chiva Computer
```

2. Este email JÁ está verificado (é o email da sua conta Brevo)

### PASSO 2: Substituir o email_service.py

```powershell
cd D:\Projectos\versao_1_chiva\backend\cart

# Backup do antigo
copy email_service.py email_service_OLD.py

# Usar nova versão
copy email_service_v2.py email_service.py
```

### PASSO 3: Testar templates

```powershell
cd D:\Projectos\versao_1_chiva\backend

# Testar se templates estão OK
python test_templates.py

# Vai gerar arquivos preview_*.html que você pode abrir no navegador
```

### PASSO 4: Enviar email de teste

```powershell
# Teste simples
python test_email_simple.py

# Agora DEVE chegar no email jsabonete09@gmail.com
```

---

## 📝 O QUE MUDOU

### ANTES (inline):
```python
# Templates estavam embutidos no código Python
html_content = f"""
    <!DOCTYPE html>
    <html>...{customer_name}...</html>
"""
```

### AGORA (arquivos separados):
```python
# Templates em arquivos HTML editáveis
template = self._load_template('order_confirmation.html')
context = {'CUSTOMER_NAME': customer_name, ...}
html_content = self._render_template(template, context)
```

**Vantagens:**
- ✅ Fácil editar (só abrir HTML e modificar)
- ✅ Não precisa mexer no código Python
- ✅ Pode usar editor visual de HTML
- ✅ Testar no navegador antes de enviar

---

## 🎨 CUSTOMIZAÇÃO DOS TEMPLATES

### Mudar cores (exemplo):

Abra `cart/email_templates/order_confirmation.html` e edite:

```html
<!-- Linha 17 - Cabeçalho -->
<td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); ...">

<!-- Trocar para vermelho: -->
<td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); ...">
```

### Adicionar logo:

```html
<!-- Dentro do <td> do header -->
<img src="https://chivacomputer.co.mz/logo.png" 
     alt="Chiva Computer" 
     style="max-width: 200px; margin-bottom: 15px;">
<h1 style="margin: 0; font-size: 28px;">🎉 Pedido Confirmado!</h1>
```

### Alterar textos:

Todos os textos fixos podem ser editados diretamente no HTML.

---

## 🧪 TESTAR NO NAVEGADOR

### Gerar previews:

```powershell
cd D:\Projectos\versao_1_chiva\backend
python test_templates.py
```

Vai criar:
- `preview_order_confirmation.html`
- `preview_payment_status.html`
- `preview_shipping_update.html`
- `preview_cart_recovery.html`
- `preview_admin_new_order.html`

Abra esses arquivos no Chrome/Firefox para ver como ficam.

---

## 📋 VARIÁVEIS DOS TEMPLATES

### Todas as variáveis usam o formato `{{NOME_VARIAVEL}}`

**`order_confirmation.html`:**
- `{{CUSTOMER_NAME}}` - Nome do cliente
- `{{ORDER_NUMBER}}` - Número do pedido
- `{{ORDER_DATE}}` - Data
- `{{ORDER_ITEMS}}` - Tabela de produtos (HTML)
- `{{TOTAL_AMOUNT}}` - Valor total
- E mais...

**`payment_status.html`:**
- `{{STATUS_EMOJI}}` - ✅ ⏳ ❌
- `{{STATUS_TITLE}}` - Título
- `{{STATUS_MESSAGE}}` - Mensagem
- `{{HEADER_COLOR}}` - Cor do header (muda por status)
- `{{BG_COLOR}}` - Cor de fundo
- E mais...

Ver lista completa em `TEMPLATES_EMAIL_GUIA.md`

---

## ⚠️ REGRAS IMPORTANTES PARA EMAILS HTML

### ❌ NÃO FUNCIONA:
```html
<!-- CSS externo -->
<link rel="stylesheet" href="style.css">

<!-- Classes CSS -->
<style>.button { color: blue; }</style>
<div class="button">Click</div>

<!-- JavaScript -->
<script>alert('oi');</script>

<!-- Divs para layout -->
<div style="display: flex;">...</div>
```

### ✅ FUNCIONA:
```html
<!-- CSS inline direto no elemento -->
<div style="color: blue; padding: 10px;">Click</div>

<!-- Tabelas para layout -->
<table width="600">
  <tr><td>Conteúdo</td></tr>
</table>

<!-- Imagens com URL completa -->
<img src="https://site.com/imagem.png" alt="Logo">
```

---

## 🔄 FLUXO DE ENVIO DE EMAILS

### 1. Compra aprovada:
```
Webhook Paysuite → views.py → email_service.py →
  ├─ send_order_confirmation() → order_confirmation.html
  ├─ send_payment_status_update() → payment_status.html
  └─ send_new_order_notification_to_admin() → admin_new_order.html
```

### 2. Pedido enviado:
```
Admin muda status → stock_management.py → email_service.py →
  └─ send_shipping_update() → shipping_update.html
```

### 3. Carrinho abandonado:
```
Cron job → send_cart_recovery_emails.py → email_service.py →
  └─ send_cart_recovery_email() → cart_recovery.html
```

---

## 🆘 PROBLEMAS COMUNS

### ❌ Email não chega

**Causa:** Sender email não verificado no Brevo

**Solução:**
1. Use `jsabonete09@gmail.com` no `.env` (já verificado)
2. OU verifique domínio `chivacomputer.co.mz` no Brevo (DNS records)

Ver guia completo em `VERIFICAR_SENDER_EMAIL.md`

---

### ❌ Variáveis aparecendo como {{NOME}}

**Causa:** Variável não foi passada no context

**Solução:**
```python
# Certifique-se de passar todas as variáveis:
context = {
    'CUSTOMER_NAME': customer_name,  # ← não esquecer nenhuma
    'ORDER_NUMBER': order.order_number,
    # ...
}
```

---

### ❌ Layout quebrado no email

**Causa:** CSS não inline ou tags modernas não suportadas

**Solução:**
- Use apenas CSS inline
- Use tabelas para layout
- Teste em https://litmus.com/

---

## 📚 PRÓXIMOS PASSOS

### Para desenvolvimento:
1. ✅ Use `jsabonete09@gmail.com` como sender
2. ✅ Teste emails com `python test_email_simple.py`
3. ✅ Customize templates conforme necessário
4. ✅ Gere previews com `python test_templates.py`

### Para produção:
1. ⏳ Verifique domínio no Brevo (adicione DNS records)
2. ⏳ Aguarde verificação (15min - 48h)
3. ⏳ Altere sender para `noreply@chivacomputer.co.mz`
4. ⏳ Teste em produção

---

## 📞 SUPORTE

Se tiver dúvidas:
1. Leia `TEMPLATES_EMAIL_GUIA.md`
2. Leia `VERIFICAR_SENDER_EMAIL.md`
3. Execute `python test_templates.py` para debug
4. Verifique logs do Brevo dashboard

---

**Criado em:** Janeiro 2024
**Versão:** 2.0 (templates externos)
**Status:** ✅ Pronto para uso

