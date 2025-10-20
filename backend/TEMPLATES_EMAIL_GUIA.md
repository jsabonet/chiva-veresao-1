# 📧 Templates HTML de Email - Guia de Uso

## ✅ O QUE FOI CRIADO

### 5 Templates HTML Separados:

1. **`order_confirmation.html`** - Confirmação de pedido
2. **`payment_status.html`** - Status de pagamento (aprovado/pendente/falhou)
3. **`shipping_update.html`** - Atualização de envio
4. **`cart_recovery.html`** - Recuperação de carrinho abandonado
5. **`admin_new_order.html`** - Notificação para admin de nova venda

### Localização:
```
backend/cart/email_templates/
├── order_confirmation.html
├── payment_status.html
├── shipping_update.html
├── cart_recovery.html
└── admin_new_order.html
```

---

## 🔄 COMO USAR A NOVA VERSÃO

### Opção 1: Substituir o arquivo atual (RECOMENDADO)

```bash
cd D:\Projectos\versao_1_chiva\backend\cart

# Fazer backup do arquivo antigo
copy email_service.py email_service_OLD.py

# Substituir pela versão nova
copy email_service_v2.py email_service.py
```

### Opção 2: Testar antes de substituir

Use `email_service_v2.py` para testes e depois substitua.

---

## 📝 VARIÁVEIS DOS TEMPLATES

### `order_confirmation.html`
```
{{CUSTOMER_NAME}} - Nome do cliente
{{ORDER_NUMBER}} - Número do pedido
{{ORDER_DATE}} - Data do pedido
{{ORDER_STATUS}} - Status do pedido
{{ORDER_ITEMS}} - HTML da tabela de produtos
{{SUBTOTAL}} - Subtotal
{{SHIPPING_COST}} - Custo de envio
{{TOTAL_AMOUNT}} - Total
{{SHIPPING_ADDRESS}} - Endereço de entrega
{{PAYMENT_METHOD}} - Método de pagamento
```

### `payment_status.html`
```
{{CUSTOMER_NAME}} - Nome do cliente
{{STATUS_EMOJI}} - Emoji do status (✅ ⏳ ❌)
{{STATUS_TITLE}} - Título do status
{{STATUS_MESSAGE}} - Mensagem do status
{{HEADER_COLOR}} - Cor do cabeçalho (gradiente CSS)
{{BG_COLOR}} - Cor de fundo das caixas
{{ORDER_NUMBER}} - Número do pedido
{{PAYMENT_STATUS}} - Status (APPROVED/PENDING/FAILED)
{{TOTAL_AMOUNT}} - Valor total
{{CTA_TEXT}} - Texto do botão
{{CTA_URL}} - Link do botão
```

### `shipping_update.html`
```
{{CUSTOMER_NAME}} - Nome do cliente
{{ORDER_NUMBER}} - Número do pedido
{{SHIPPING_METHOD}} - Método de envio
{{TRACKING_SECTION}} - HTML da seção de rastreamento (opcional)
```

### `cart_recovery.html`
```
{{CUSTOMER_NAME}} - Nome do cliente
{{ITEMS_COUNT}} - Quantidade de itens
{{ITEMS_TEXT}} - "item" ou "itens"
{{CART_ITEMS}} - HTML dos itens do carrinho
{{CART_TOTAL}} - Total do carrinho
{{RECOVERY_URL}} - Link de recuperação
```

### `admin_new_order.html`
```
{{ORDER_NUMBER}} - Número do pedido
{{ORDER_DATE}} - Data do pedido
{{CUSTOMER_NAME}} - Nome do cliente
{{CUSTOMER_EMAIL}} - Email do cliente
{{CUSTOMER_PHONE}} - Telefone do cliente
{{SHIPPING_ADDRESS}} - Endereço
{{SHIPPING_CITY}} - Cidade
{{SHIPPING_PROVINCE}} - Província
{{ORDER_ITEMS}} - HTML dos itens
{{TOTAL_AMOUNT}} - Total
{{ACTION_SECTION}} - Seção de ação necessária (opcional)
```

---

## ✏️ COMO EDITAR OS TEMPLATES

### 1. Abra o arquivo HTML desejado
```
D:\Projectos\versao_1_chiva\backend\cart\email_templates\order_confirmation.html
```

### 2. Edite o HTML diretamente
- Altere cores, textos, layout
- Mantenha as variáveis `{{VARIAVEL}}` intactas
- Use CSS inline (emails não suportam CSS externo)

### 3. Salve e teste
```bash
cd D:\Projectos\versao_1_chiva\backend
python test_email_simple.py
```

---

## 🎨 EXEMPLOS DE CUSTOMIZAÇÃO

### Mudar cores do cabeçalho:

**`order_confirmation.html`** linha 17:
```html
<!-- Antes -->
<td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); ...">

<!-- Depois (vermelho) -->
<td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); ...">
```

### Adicionar logo da empresa:

```html
<!-- Dentro do header -->
<img src="https://chivacomputer.co.mz/logo.png" alt="Logo" style="max-width: 200px; margin-bottom: 20px;">
```

### Mudar fonte:

```html
<!-- No body -->
<body style="font-family: 'Arial', sans-serif; ...">
```

---

## 🧪 TESTAR TEMPLATES

### Teste simples (1 email):
```bash
cd D:\Projectos\versao_1_chiva\backend
python test_email_simple.py
```

### Teste completo (todos os tipos):
```bash
python test_email_system.py
```

---

## ⚠️ IMPORTANTE

### ❌ NÃO FUNCIONA (inline CSS):
```html
<style>
  .button { background: blue; }
</style>
<div class="button">Click</div>
```

### ✅ FUNCIONA (CSS inline direto):
```html
<div style="background: blue; padding: 10px;">Click</div>
```

### ❌ NÃO FUNCIONA (JavaScript):
```html
<script>alert('teste');</script>
```

### ✅ FUNCIONA (tabelas para layout):
```html
<table width="100%">
  <tr>
    <td>Conteúdo</td>
  </tr>
</table>
```

---

## 🚀 PRÓXIMOS PASSOS

1. **Resolva o problema do sender email:**
   - Leia `VERIFICAR_SENDER_EMAIL.md`
   - Use `jsabonete09@gmail.com` para testes

2. **Substitua o email_service.py:**
   ```bash
   copy email_service_v2.py email_service.py
   ```

3. **Teste novamente:**
   ```bash
   python test_email_simple.py
   ```

4. **Customize os templates:**
   - Edite os HTMLs conforme necessário
   - Adicione logo, mude cores, etc.

5. **Teste em produção:**
   - Faça uma compra teste
   - Verifique se emails chegam

---

## 📚 REFERÊNCIAS

- **Brevo Docs:** https://developers.brevo.com/docs
- **Email HTML Best Practices:** https://www.campaignmonitor.com/css/
- **Template Testing:** https://litmus.com/

