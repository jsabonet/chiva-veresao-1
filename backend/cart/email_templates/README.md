# 📧 Email Templates - Chiva Computer

## 📁 Templates Disponíveis

Este diretório contém todos os templates HTML de email usados pelo sistema.

### 1. `order_confirmation.html`
**Quando é enviado:** Logo após criação do pedido  
**Para quem:** Cliente  
**Conteúdo:**
- Número do pedido
- Lista de produtos comprados
- Total e custos de envio
- Endereço de entrega
- Próximos passos

**Variáveis:**
```
{{CUSTOMER_NAME}} - Nome do cliente
{{ORDER_NUMBER}} - Número do pedido (CHV-12345)
{{ORDER_DATE}} - Data e hora (01/01/2024 às 10:30)
{{ORDER_STATUS}} - Status do pedido
{{ORDER_ITEMS}} - HTML da tabela de produtos
{{SUBTOTAL}} - Subtotal dos produtos
{{SHIPPING_COST}} - Custo de envio
{{TOTAL_AMOUNT}} - Total final
{{SHIPPING_ADDRESS}} - Endereço completo de entrega
{{PAYMENT_METHOD}} - Método de pagamento (M-PESA, e-Mola)
```

---

### 2. `payment_status.html`
**Quando é enviado:** Quando status do pagamento muda  
**Para quem:** Cliente  
**Conteúdo:**
- Status do pagamento (aprovado/pendente/falhou)
- Mensagem personalizada por status
- Cores diferentes por status (verde/amarelo/vermelho)
- Botão de ação

**Variáveis:**
```
{{CUSTOMER_NAME}} - Nome do cliente
{{STATUS_EMOJI}} - ✅ (aprovado) | ⏳ (pendente) | ❌ (falhou)
{{STATUS_TITLE}} - Título do status
{{STATUS_MESSAGE}} - Mensagem explicativa
{{HEADER_COLOR}} - Cor do cabeçalho (CSS gradient)
{{BG_COLOR}} - Cor de fundo das caixas
{{ORDER_NUMBER}} - Número do pedido
{{PAYMENT_STATUS}} - APPROVED | PENDING | FAILED
{{TOTAL_AMOUNT}} - Valor total
{{CTA_TEXT}} - Texto do botão
{{CTA_URL}} - Link do botão
```

**Cores por status:**
- ✅ **Aprovado:** Verde (#10b981)
- ⏳ **Pendente:** Amarelo/Laranja (#f59e0b)
- ❌ **Falhou:** Vermelho (#ef4444)

---

### 3. `shipping_update.html`
**Quando é enviado:** Quando pedido é despachado  
**Para quem:** Cliente  
**Conteúdo:**
- Confirmação de envio
- Método de envio usado
- Código de rastreamento (se disponível)
- Link para acompanhar entrega

**Variáveis:**
```
{{CUSTOMER_NAME}} - Nome do cliente
{{ORDER_NUMBER}} - Número do pedido
{{SHIPPING_METHOD}} - Método de envio (Entrega Expressa, etc.)
{{TRACKING_SECTION}} - HTML da seção de rastreamento (opcional)
```

**Tracking Section (se disponível):**
```html
<table width="100%" cellpadding="15" cellspacing="0" style="background: #d1fae5; border-left: 4px solid #10b981; border-radius: 5px; margin: 25px 0;">
    <tr>
        <td style="text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #065f46;">
                <strong>Código de Rastreamento:</strong>
            </p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #10b981; letter-spacing: 2px;">
                ABC123XYZ
            </p>
        </td>
    </tr>
</table>
```

---

### 4. `cart_recovery.html`
**Quando é enviado:** Carrinho abandonado há X horas  
**Para quem:** Cliente que deixou itens no carrinho  
**Conteúdo:**
- Lembrete de carrinho abandonado
- Lista de produtos esquecidos
- Total do carrinho
- Link direto para finalizar compra
- Aviso de estoque limitado

**Variáveis:**
```
{{CUSTOMER_NAME}} - Nome do cliente
{{ITEMS_COUNT}} - Quantidade de itens (número)
{{ITEMS_TEXT}} - "item" ou "itens" (plural)
{{CART_ITEMS}} - HTML dos itens do carrinho
{{CART_TOTAL}} - Total do carrinho
{{RECOVERY_URL}} - Link de recuperação (vai direto ao checkout)
```

**Cart Items HTML esperado:**
```html
<table width="100%" cellpadding="10" cellspacing="0" style="background: #f8f9fa; border-radius: 5px; margin: 10px 0;">
    <tr>
        <td style="width: 70%;">
            <strong>Nome do Produto</strong>
            <br><span style="color: #666; font-size: 14px;">Cor: Preto</span>
        </td>
        <td style="text-align: center; color: #666;">
            x2
        </td>
        <td style="text-align: right; font-weight: bold;">
            1,500.00 MZN
        </td>
    </tr>
</table>
```

---

### 5. `admin_new_order.html`
**Quando é enviado:** Nova venda realizada  
**Para quem:** Admin/Equipe  
**Conteúdo:**
- Alerta de nova venda
- Informações completas do cliente
- Endereço de entrega
- Lista de produtos vendidos
- Total da venda
- Ações necessárias (se houver)

**Variáveis:**
```
{{ORDER_NUMBER}} - Número do pedido
{{ORDER_DATE}} - Data e hora da venda
{{CUSTOMER_NAME}} - Nome do cliente
{{CUSTOMER_EMAIL}} - Email do cliente
{{CUSTOMER_PHONE}} - Telefone do cliente
{{SHIPPING_ADDRESS}} - Endereço
{{SHIPPING_CITY}} - Cidade
{{SHIPPING_PROVINCE}} - Província
{{ORDER_ITEMS}} - HTML dos itens vendidos
{{TOTAL_AMOUNT}} - Total da venda
{{ACTION_SECTION}} - Seção de ações necessárias (opcional)
```

**Action Section (se necessário):**
```html
<table width="100%" cellpadding="15" cellspacing="0" style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px; margin: 25px 0;">
    <tr>
        <td>
            <p style="margin: 0; font-size: 14px; color: #856404;">
                ⚠️ <strong>Ação Necessária:</strong> Aguardando confirmação de pagamento
            </p>
        </td>
    </tr>
</table>
```

---

## 🎨 Guia de Customização

### Mudar Cores:

Procure por `background: linear-gradient(...)` e altere:

**Gradiente Azul/Roxo (padrão):**
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

**Gradiente Verde:**
```css
background: linear-gradient(135deg, #10b981 0%, #059669 100%);
```

**Gradiente Vermelho:**
```css
background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
```

**Cor sólida:**
```css
background: #667eea;
```

---

### Adicionar Logo:

Dentro do `<td>` do header, adicione:

```html
<img src="https://chivacomputer.co.mz/logo.png" 
     alt="Chiva Computer" 
     style="max-width: 200px; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;">
```

---

### Alterar Fontes:

No `<body>` tag, altere `font-family`:

```html
<!-- Atual -->
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; ...">

<!-- Arial -->
<body style="font-family: Arial, sans-serif; ...">

<!-- Georgia (serif) -->
<body style="font-family: Georgia, serif; ...">
```

---

## ⚠️ Regras Importantes

### ✅ PODE:
- CSS inline direto nos elementos
- Tabelas para layout
- Imagens com URL completa (https://)
- Cores hexadecimal ou RGB
- Fontes web-safe (Arial, Georgia, etc.)

### ❌ NÃO PODE:
- `<style>` tags ou CSS externo
- Classes CSS
- JavaScript
- `<div>` com flexbox/grid
- Imagens locais (use URLs)
- Fontes customizadas (@font-face)

---

## 🧪 Testar Templates

### Gerar preview no navegador:
```powershell
cd D:\Projectos\versao_1_chiva\backend
python test_templates.py
```

Vai criar arquivos `preview_*.html` que podem ser abertos no navegador.

---

## 📐 Dimensões Recomendadas

- **Largura do email:** 600px (máximo)
- **Imagens:** Máximo 200KB cada
- **Logo:** 200px de largura
- **Botões:** 15px padding vertical, 50px horizontal
- **Fontes:** 14-16px para texto, 24-32px para títulos

---

## 🔄 Processo de Renderização

1. **Email Service carrega template:**
   ```python
   template = self._load_template('order_confirmation.html')
   ```

2. **Prepara contexto com dados reais:**
   ```python
   context = {
       'CUSTOMER_NAME': 'João Silva',
       'ORDER_NUMBER': 'CHV-12345',
       # ...
   }
   ```

3. **Substitui variáveis {{VAR}}:**
   ```python
   html = self._render_template(template, context)
   ```

4. **Envia via Brevo:**
   ```python
   self._send_email(to_email, subject, html)
   ```

---

## 📚 Recursos

- **HTML Email Guide:** https://www.campaignmonitor.com/css/
- **Email Testing:** https://litmus.com/
- **Brevo Docs:** https://developers.brevo.com/

---

**Última atualização:** Janeiro 2024  
**Versão:** 2.0
