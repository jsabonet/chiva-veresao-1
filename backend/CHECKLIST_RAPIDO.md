# ✅ CHECKLIST RÁPIDO - Próximos Passos

## 🎯 AGORA (5 minutos)

### 1. Verificar Email de Teste ⏰
```
□ Abrir Gmail: jsabonete09@gmail.com
□ Procurar email de "Chiva Computer"
□ Se não encontrar, verificar SPAM
□ Se recebeu → SUCESSO! ✅
```

---

## 🎯 HOJE (30 minutos)

### 2. Fazer Compra de Teste 🛒
```
□ Iniciar servidor: python manage.py runserver
□ Acessar: http://localhost:8000
□ Adicionar produtos ao carrinho
□ Finalizar compra com seus dados
□ Pagar com M-Pesa/e-Mola
□ Aguardar 3 emails automáticos:
  □ Confirmação de pedido
  □ Pagamento aprovado
  □ Notificação admin
```

### 3. Testar Email de Envio 📦
```
□ Acessar Django Admin: http://localhost:8000/admin
□ Ir em Cart → Orders
□ Abrir pedido de teste
□ Mudar status para "Shipped"
□ Salvar
□ Verificar email "Pedido Enviado"
```

---

## 🎯 ESTA SEMANA (2 horas)

### 4. Customizar Templates 🎨
```
□ Abrir: cart/email_templates/order_confirmation.html
□ Mudar cores se quiser
□ Adicionar logo da empresa
□ Testar: python test_templates.py
□ Abrir preview_*.html no navegador
```

### 5. Configurar Cron Job ⏰
```
□ Abrir Task Scheduler (Windows)
□ Criar tarefa:
  Nome: Chiva Cart Recovery
  Horário: Diariamente 10:00 e 18:00
  Programa: python.exe
  Argumentos: manage.py send_cart_recovery_emails
□ Testar manualmente
```

---

## 🎯 ANTES DE PRODUÇÃO (1 dia)

### 6. Verificar Domínio no Brevo 🔐
```
□ Acessar: https://app.brevo.com/
□ Ir em: Settings → Senders & IP
□ Clicar: "Add a domain"
□ Adicionar: chivacomputer.co.mz
□ Copiar registros DNS fornecidos
□ Adicionar no provedor de domínio:
  □ TXT @ "brevo-code=..."
  □ TXT _dmarc "v=DMARC1..."
  □ TXT mail._domainkey "v=DKIM1..."
□ Aguardar verificação (15min - 48h)
□ Quando verificado:
  □ Mudar .env: BREVO_SENDER_EMAIL=noreply@chivacomputer.co.mz
```

### 7. Preparar Deploy 🚀
```
□ Fazer backup dos templates
□ Testar tudo novamente
□ Atualizar .env produção:
  □ BREVO_SENDER_EMAIL=noreply@chivacomputer.co.mz (após verificado)
  □ DEBUG=False
  □ EMAIL_NOTIFICATIONS_ENABLED=True
□ Fazer deploy
□ Testar em produção
```

---

## 📊 PROGRESSO ATUAL

```
✅ Email service implementado
✅ Templates HTML criados
✅ Sender verificado configurado
✅ Teste simples enviado
□ Email de teste recebido? (VERIFICAR AGORA)
□ Compra de teste feita?
□ Emails automáticos funcionando?
□ Templates customizados?
□ Cron job configurado?
□ Domínio verificado?
□ Deploy em produção?
```

---

## 🎯 PRÓXIMA AÇÃO IMEDIATA

**👉 AGORA: Verifique seu Gmail!**

1. Abra: jsabonete09@gmail.com
2. Procure: Email de "Chiva Computer"
3. Se recebeu: ✅ Sistema funcionando!
4. Se não recebeu: Verifique SPAM

**Depois:**
- Faça compra de teste no site
- Veja emails automáticos chegarem
- Pronto! 🎉

---

## 📞 COMANDOS RÁPIDOS

```powershell
# Verificar configuração
python test_config.py

# Testar email
python test_email_simple.py

# Ver templates
python test_templates.py

# Iniciar servidor
python manage.py runserver

# Comando carrinho abandonado
python manage.py send_cart_recovery_emails --dry-run
```

---

**Status:** ✅ Sistema pronto para uso  
**Ação:** Verificar email e fazer compra de teste

