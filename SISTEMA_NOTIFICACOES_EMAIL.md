# 📧 Sistema de Notificações por Email - Chiva Computer

## 🎯 Visão Geral

Sistema completo de notificações por email **100% GRATUITO** usando **Brevo (antigo Sendinblue)**.

### ✅ Recursos Implementados

#### **Para Clientes:**
- ✉️ Confirmação de pedido criado
- 💳 Status de pagamento (aprovado/pendente/falhou)
- 📦 Atualização de envio com tracking
- 🛒 Recuperação de carrinho abandonado
- 🎨 Templates HTML profissionais e responsivos

#### **Para Admin:**
- 🔔 Notificação de nova venda
- 📊 Detalhes completos do pedido
- 💰 Resumo financeiro

---

## 🚀 Configuração do Brevo (GRATUITO)

### 1. Criar Conta Grátis

1. Acesse: [https://www.brevo.com](https://www.brevo.com)
2. Clique em **"Sign up free"**
3. Preencha os dados:
   - Email
   - Nome da empresa: **Chiva Computer**
   - País: **Moçambique**
4. Confirme o email

### 2. Obter API Key

1. Faça login no [Brevo Dashboard](https://app.brevo.com)
2. Vá em **Settings** (⚙️) → **SMTP & API**
3. Clique em **"API Keys"**
4. Clique em **"Generate a new API key"**
5. Dê um nome: `Chiva Computer API`
6. **COPIE A API KEY** (você só verá uma vez!)

### 3. Configurar Sender Email

1. No Brevo, vá em **Settings** → **Senders**
2. Clique em **"Add a sender"**
3. Preencha:
   - **Email:** `noreply@chivacomputer.co.mz`
   - **Name:** `Chiva Computer`
4. **Verifique o domínio** (clique em "Verify domain" e siga instruções)

> ⚠️ **Importante:** Enquanto o domínio não for verificado, use um email pessoal (Gmail, Outlook) como sender temporariamente.

---

## ⚙️ Configuração do Backend

### 1. Instalar Dependências

```bash
cd backend
pip install -r requirements.txt
```

Isso instalará o `sib-api-v3-sdk==7.6.0` (SDK oficial do Brevo).

### 2. Configurar Variáveis de Ambiente

Crie/edite o arquivo `.env` na pasta `backend/`:

```env
# ==========================================
# EMAIL CONFIGURATION (BREVO)
# ==========================================

# API Key do Brevo (obrigatório)
BREVO_API_KEY=xkeysib-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Email do remetente (deve estar verificado no Brevo)
BREVO_SENDER_EMAIL=noreply@chivacomputer.co.mz
BREVO_SENDER_NAME=Chiva Computer

# Email do admin para receber notificações de vendas
ADMIN_EMAIL=admin@chivacomputer.co.mz

# Ativar/desativar notificações por email
EMAIL_NOTIFICATIONS_ENABLED=True

# Controlar tipos específicos de emails
SEND_ORDER_CONFIRMATION=True
SEND_PAYMENT_STATUS=True
SEND_SHIPPING_UPDATES=True
SEND_CART_RECOVERY=True
SEND_ADMIN_NOTIFICATIONS=True

# Configurações de carrinho abandonado
CART_ABANDONMENT_HOURS=2        # Horas de inatividade antes de considerar abandonado
MAX_RECOVERY_EMAILS=3           # Máximo de emails de recuperação por carrinho
```

### 3. Testar Configuração

Execute o console Django para testar:

```bash
cd backend
python manage.py shell
```

No console Python:

```python
from cart.email_service import get_email_service

# Criar instância do serviço
email_service = get_email_service()

# Verificar se está configurado
print(f"Email habilitado: {email_service.enabled}")
print(f"API Key configurada: {'Sim' if email_service.api_key else 'Não'}")
print(f"Sender: {email_service.sender_name} <{email_service.sender_email}>")
```

---

## 📧 Tipos de Emails Implementados

### 1. Confirmação de Pedido

**Enviado quando:** Pagamento é confirmado via webhook

**Conteúdo:**
- Número do pedido
- Lista de produtos com preços
- Endereço de entrega
- Total do pedido
- Próximos passos
- Botão CTA para acompanhar pedido

### 2. Status de Pagamento

**Enviado quando:** Status do pagamento muda

**Variações:**
- ✅ **Aprovado:** Confirmação de pagamento bem-sucedido
- ⏳ **Pendente:** Aguardando confirmação
- ❌ **Falhou:** Pagamento recusado com botão para tentar novamente

### 3. Atualização de Envio

**Enviado quando:** Pedido é marcado como enviado (admin atualiza)

**Conteúdo:**
- Código de rastreamento
- Método de envio
- Previsão de entrega
- Botão para rastrear

### 4. Recuperação de Carrinho Abandonado

**Enviado quando:** Comando `send_cart_recovery_emails` é executado

**Conteúdo:**
- Lista de produtos no carrinho
- Total do carrinho
- Link único para recuperar carrinho
- Alerta de estoque limitado
- Botão CTA para finalizar compra

### 5. Notificação para Admin (Nova Venda)

**Enviado quando:** Nova venda é confirmada

**Conteúdo:**
- Número e data do pedido
- Dados do cliente
- Endereço de entrega
- Lista completa de produtos
- Total da venda

---

## 🔄 Fluxo de Envio de Emails

### Durante Checkout e Pagamento:

```
1. Cliente finaliza pedido
   ↓
2. Webhook do Paysuite recebe confirmação
   ↓
3. Sistema cria Order e OrderItems
   ↓
4. ✉️ Envia email de confirmação para cliente
   ↓
5. ✉️ Envia email de pagamento aprovado para cliente
   ↓
6. ✉️ Envia notificação de nova venda para admin
```

### Para Carrinhos Abandonados:

```
1. Cliente adiciona produtos ao carrinho
   ↓
2. Cliente sai sem finalizar (inatividade > 2 horas)
   ↓
3. Comando cron é executado (diariamente)
   ↓
4. Sistema identifica carrinhos abandonados
   ↓
5. ✉️ Envia email de recuperação (máx 3x por carrinho)
```

---

## 🤖 Automatizar Recuperação de Carrinhos

### Comando Django

```bash
# Enviar emails de recuperação
python manage.py send_cart_recovery_emails

# Modo teste (não envia, apenas mostra)
python manage.py send_cart_recovery_emails --dry-run

# Forçar envio mesmo se atingiu limite
python manage.py send_cart_recovery_emails --force
```

### Agendar com Cron (Linux/Mac)

Edite o crontab:

```bash
crontab -e
```

Adicione (executar todo dia às 10h e 18h):

```cron
0 10,18 * * * cd /caminho/do/projeto/backend && /caminho/do/python manage.py send_cart_recovery_emails >> /var/log/cart_recovery.log 2>&1
```

### Agendar com Task Scheduler (Windows)

1. Abra **Task Scheduler**
2. Create Basic Task
3. Name: `Cart Recovery Emails`
4. Trigger: **Daily** at 10:00 AM
5. Action: **Start a program**
   - Program: `C:\Python39\python.exe`
   - Arguments: `manage.py send_cart_recovery_emails`
   - Start in: `D:\Projectos\versao_1_chiva\backend`

---

## 🎨 Personalizar Templates

Os templates HTML estão inline no arquivo `email_service.py`. Para personalizar:

1. Abra: `backend/cart/email_service.py`
2. Localize o método do email que deseja editar:
   - `send_order_confirmation()`
   - `send_payment_status_update()`
   - `send_shipping_update()`
   - `send_cart_recovery_email()`
3. Edite o HTML na variável `html_content`

### Dicas de Personalização:

- Use **inline CSS** (melhor compatibilidade com clientes de email)
- Mantenha largura máxima de **600px**
- Teste em [Litmus](https://litmus.com) ou [Email on Acid](https://www.emailonacid.com)
- Use cores da marca: `#667eea` (primary), `#764ba2` (secondary)

---

## 📊 Monitoramento e Logs

### Ver Logs de Envio

```bash
# Logs do Django (no terminal onde o servidor roda)
# Busque por:
# ✅ Email enviado com sucesso
# ❌ Erro ao enviar email
```

### Dashboard do Brevo

1. Acesse [Brevo Dashboard](https://app.brevo.com)
2. Vá em **Statistics** → **Transactional**
3. Veja:
   - Emails enviados
   - Taxa de abertura
   - Taxa de cliques
   - Bounces
   - Spam reports

---

## 🚨 Troubleshooting

### Emails não estão sendo enviados

1. **Verificar se está habilitado:**
   ```python
   # No Django shell
   from django.conf import settings
   print(settings.EMAIL_NOTIFICATIONS_ENABLED)
   print(settings.BREVO_API_KEY)
   ```

2. **Verificar logs:**
   - Procure por erros no terminal do servidor Django
   - Mensagens começam com `📧` ou `❌`

3. **Testar API Key:**
   ```python
   from cart.email_service import get_email_service
   email_service = get_email_service()
   print(email_service.enabled)
   ```

### Emails vão para SPAM

1. **Verificar domínio no Brevo:**
   - Settings → Senders → Verify domain
   - Adicionar registros SPF e DKIM no DNS

2. **Evitar palavras suspeitas:**
   - Não use: "GRÁTIS", "CLIQUE AQUI", "URGENTE"
   - Mantenha equilíbrio texto/imagem

3. **Adicionar link de unsubscribe:**
   - Já incluído nos templates

### Limite de 300 emails/dia atingido

1. **Verificar uso:**
   - Dashboard Brevo → Statistics

2. **Otimizar envios:**
   - Reduzir frequência de recuperação de carrinho
   - Agrupar notificações de admin

3. **Upgrade para plano pago:**
   - A partir de €25/mês = 20.000 emails

---

## 💰 Limites do Plano Gratuito

### Brevo Free Plan:

- ✅ **300 emails/dia** (9.000/mês)
- ✅ **Ilimitado contatos**
- ✅ **Email transacional**
- ✅ **Templates HTML**
- ✅ **API completa**
- ✅ **Estatísticas básicas**
- ❌ Sem email marketing campaigns
- ❌ Sem remover marca Brevo

### Quando fazer upgrade?

- Quando atingir consistentemente 300 emails/dia
- Quando quiser campanhas de marketing
- Quando precisar de mais de 1 sender

---

## 🔐 Segurança

### Proteger API Key

1. **NUNCA commite `.env` no Git:**
   ```bash
   # Adicionar no .gitignore
   echo ".env" >> .gitignore
   ```

2. **Usar variáveis de ambiente em produção:**
   - No servidor, configure via environment variables
   - Não hardcode no código

3. **Rotacionar API Key periodicamente:**
   - A cada 6 meses ou se houver vazamento
   - Gere nova key no Brevo Dashboard

---

## 📈 Próximos Passos (Futuro)

### Email Marketing (quando tiver orçamento):

1. **Newsletter semanal:**
   - Novos produtos
   - Promoções
   - Dicas técnicas

2. **Segmentação:**
   - Por categoria de interesse
   - Por histórico de compras
   - Por valor do cliente

3. **Automações:**
   - Welcome series (5 emails)
   - Win-back campaign (clientes inativos)
   - Pós-venda (solicitar review)

### Integração com WhatsApp:

- Usar Twilio ou Wati.io
- Notificações de pedido via WhatsApp
- Bot para suporte

---

## 📞 Suporte

### Dúvidas sobre Brevo:
- Documentação: [https://developers.brevo.com](https://developers.brevo.com)
- Suporte: [https://help.brevo.com](https://help.brevo.com)

### Dúvidas sobre implementação:
- Email: suporte@chivacomputer.co.mz
- Ver logs do sistema
- Consultar este guia

---

## ✅ Checklist de Implementação

- [ ] Criar conta no Brevo
- [ ] Obter API Key
- [ ] Configurar sender email
- [ ] Verificar domínio (opcional mas recomendado)
- [ ] Configurar `.env` com variáveis
- [ ] Instalar dependências (`pip install -r requirements.txt`)
- [ ] Testar envio de email no Django shell
- [ ] Fazer uma compra de teste
- [ ] Verificar recebimento de emails
- [ ] Configurar cron para recuperação de carrinhos
- [ ] Monitorar dashboard do Brevo

---

## 🎉 Conclusão

Agora você tem um **sistema profissional de emails 100% GRATUITO** que:

- ✅ Confirma pedidos automaticamente
- ✅ Notifica clientes sobre status
- ✅ Recupera vendas perdidas (carrinhos abandonados)
- ✅ Mantém admin informado
- ✅ Escala até 300 emails/dia
- ✅ Templates bonitos e responsivos

**Quando o negócio crescer**, é só fazer upgrade para o plano pago do Brevo e continuar usando a mesma implementação! 🚀
