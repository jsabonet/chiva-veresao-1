# 🚀 COMANDOS RÁPIDOS - SISTEMA DE EMAILS

## ⚡ CONFIGURAÇÃO INICIAL (1x só)

### 1. Editar .env para usar email verificado:
```powershell
# Abra: D:\Projectos\versao_1_chiva\backend\.env
# Altere estas linhas:

BREVO_SENDER_EMAIL=jsabonete09@gmail.com
BREVO_SENDER_NAME=Chiva Computer
```

### 2. Substituir email_service.py pela versão com templates:
```powershell
cd D:\Projectos\versao_1_chiva\backend\cart
copy email_service.py email_service_OLD.py
copy email_service_v2.py email_service.py
```

---

## ✅ TESTES RÁPIDOS

### Testar templates (verifica se HTML está OK):
```powershell
cd D:\Projectos\versao_1_chiva\backend
python test_templates.py
```

### Enviar 1 email de teste:
```powershell
cd D:\Projectos\versao_1_chiva\backend
python test_email_simple.py
```

### Testar todos os tipos de email:
```powershell
cd D:\Projectos\versao_1_chiva\backend
python test_email_system.py
```

### Ver configuração atual:
```powershell
cd D:\Projectos\versao_1_chiva\backend
python test_config.py
```

---

## 🎨 CUSTOMIZAR TEMPLATES

### Abrir template para editar:
```powershell
# Confirmação de pedido
notepad D:\Projectos\versao_1_chiva\backend\cart\email_templates\order_confirmation.html

# Status de pagamento
notepad D:\Projectos\versao_1_chiva\backend\cart\email_templates\payment_status.html

# Envio
notepad D:\Projectos\versao_1_chiva\backend\cart\email_templates\shipping_update.html

# Carrinho abandonado
notepad D:\Projectos\versao_1_chiva\backend\cart\email_templates\cart_recovery.html

# Notificação admin
notepad D:\Projectos\versao_1_chiva\backend\cart\email_templates\admin_new_order.html
```

### Gerar preview no navegador:
```powershell
cd D:\Projectos\versao_1_chiva\backend
python test_templates.py

# Vai criar arquivos preview_*.html
# Abra no Chrome/Firefox para visualizar
```

---

## 📋 VERIFICAÇÃO DE PROBLEMAS

### Email não chega? Verificar sender:
```powershell
# Leia o guia:
notepad D:\Projectos\versao_1_chiva\backend\VERIFICAR_SENDER_EMAIL.md
```

### Ver todos os guias:
```powershell
# Template HTML
notepad D:\Projectos\versao_1_chiva\backend\TEMPLATES_EMAIL_GUIA.md

# Resumo final
notepad D:\Projectos\versao_1_chiva\backend\EMAILS_RESUMO_FINAL.md

# Verificar sender
notepad D:\Projectos\versao_1_chiva\backend\VERIFICAR_SENDER_EMAIL.md
```

---

## 🔧 DESENVOLVIMENTO

### Executar servidor Django:
```powershell
cd D:\Projectos\versao_1_chiva\backend
python manage.py runserver
```

### Fazer backup dos templates:
```powershell
cd D:\Projectos\versao_1_chiva\backend
xcopy /E /I cart\email_templates cart\email_templates_backup
```

### Restaurar backup:
```powershell
cd D:\Projectos\versao_1_chiva\backend
xcopy /E /I /Y cart\email_templates_backup cart\email_templates
```

---

## 📊 MONITORAMENTO BREVO

### Dashboard Brevo:
```
https://app.brevo.com/
```

### Ver emails enviados:
```
Dashboard → Campaigns → Transactional
```

### Ver estatísticas:
```
Dashboard → Statistics
```

---

## 🎯 CHECKLIST DE SETUP

- [ ] ✅ Editei `.env` com `BREVO_SENDER_EMAIL=jsabonete09@gmail.com`
- [ ] ✅ Copiei `email_service_v2.py` para `email_service.py`
- [ ] ✅ Executei `python test_templates.py` → Todos OK
- [ ] ✅ Executei `python test_email_simple.py` → Email chegou
- [ ] ✅ Abri previews no navegador → Layout OK
- [ ] 🔄 Customizei templates conforme necessário
- [ ] 🔄 Testei em produção (compra real)
- [ ] ⏳ (Futuro) Verifiquei domínio no Brevo para produção

---

## 📁 ARQUIVOS IMPORTANTES

```
backend/
├── .env                           ← Configuração (API key, sender email)
├── test_templates.py              ← Testa templates
├── test_email_simple.py           ← Envia 1 email teste
├── test_email_system.py           ← Testa todos os tipos
├── test_config.py                 ← Verifica config
├── TEMPLATES_EMAIL_GUIA.md        ← Guia completo
├── VERIFICAR_SENDER_EMAIL.md      ← Como resolver delivery
├── EMAILS_RESUMO_FINAL.md         ← Resumo geral
├── COMANDOS_RAPIDOS.md            ← Este arquivo
└── cart/
    ├── email_service.py           ← Serviço de email (use v2)
    ├── email_service_v2.py        ← Versão com templates
    └── email_templates/
        ├── order_confirmation.html
        ├── payment_status.html
        ├── shipping_update.html
        ├── cart_recovery.html
        └── admin_new_order.html
```

---

## 💡 DICAS PRO

### 1. Sempre teste antes de deploy:
```powershell
python test_email_simple.py
```

### 2. Gere preview após editar template:
```powershell
python test_templates.py
# Abra preview_*.html no navegador
```

### 3. Verifique logs se email não chegar:
- Dashboard Brevo → Transactional
- Procure pelo email de destino
- Veja status: sent, delivered, blocked, bounce

### 4. Pasta spam:
Sempre verifique pasta spam/lixo eletrônico ao testar

### 5. Limite Brevo gratuito:
300 emails/dia → Para mais, upgrade plano

---

**Última atualização:** Janeiro 2024
**Status:** ✅ Sistema completo e funcional

