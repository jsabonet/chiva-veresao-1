# 📧 Quick Start - Sistema de Emails

## 🚀 Configuração Rápida (5 minutos)

### 1. Criar conta no Brevo (GRÁTIS)
- Acesse: https://www.brevo.com
- Clique em "Sign up free"
- Confirme seu email

### 2. Obter API Key
1. Login em: https://app.brevo.com
2. Settings ⚙️ → SMTP & API → API Keys
3. Clique "Generate a new API key"
4. Copie a key (você só verá uma vez!)

### 3. Configurar Backend

Edite `backend/.env`:

```env
BREVO_API_KEY=xkeysib-SUA_API_KEY_AQUI
BREVO_SENDER_EMAIL=noreply@chivacomputer.co.mz
BREVO_SENDER_NAME=Chiva Computer
ADMIN_EMAIL=admin@chivacomputer.co.mz
EMAIL_NOTIFICATIONS_ENABLED=True
```

### 4. Instalar Dependências

```bash
cd backend
pip install -r requirements.txt
```

### 5. Testar

```bash
cd backend
python test_email_system.py
```

⚠️ **IMPORTANTE:** Antes de testar, edite `test_email_system.py` e mude `teste@example.com` para **seu email real**!

## ✅ Pronto!

Emails serão enviados automaticamente quando:
- ✉️ Um pedido for confirmado
- 💳 Um pagamento for aprovado/recusado
- 📦 Um pedido for enviado
- 🛒 Um carrinho for abandonado (via comando cron)

## 📚 Documentação Completa

Ver: `SISTEMA_NOTIFICACOES_EMAIL.md`

## 🎯 Limite Gratuito

**300 emails/dia** = 9.000 emails/mês **GRÁTIS** para sempre! 🎉

---

**Dúvidas?** Leia a documentação completa em `SISTEMA_NOTIFICACOES_EMAIL.md`
