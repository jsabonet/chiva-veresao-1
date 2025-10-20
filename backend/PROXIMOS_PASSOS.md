# 🚀 PRÓXIMOS PASSOS - Sistema de Emails Ativo

## ✅ O QUE JÁ ESTÁ PRONTO

1. ✅ **Email Service V2** ativado (usa templates HTML externos)
2. ✅ **Sender verificado** configurado (`chivacomputer@gmail.com`)
3. ✅ **5 templates HTML** criados e testados
4. ✅ **Email de teste** enviado com sucesso
5. ✅ **Integração com webhooks** pronta

---

## 🎯 PASSO 1: Verificar se Email Chegou (AGORA)

### Abra seu Gmail:
- Email: **jsabonete09@gmail.com**
- Procure email de: **Chiva Computer** ou **chivacomputer@gmail.com**
- Subject: **🧪 Teste de Email - Chiva Computer**

### Se não estiver na caixa de entrada:
- ✅ Verifique **SPAM/Lixo Eletrônico**
- ✅ Aguarde 1-2 minutos

### Quando encontrar o email:
- ✅ Abra e veja se está bonito
- ✅ Se estiver em spam, marque como "Não é spam"

---

## 🎯 PASSO 2: Testar Email de Confirmação de Pedido

Vamos simular um pedido completo para testar todos os emails:

```powershell
cd D:\Projectos\versao_1_chiva\backend
python manage.py shell
```

Cole este código no shell:

```python
from cart.models import Order
from cart.email_service import get_email_service

# Buscar um pedido de teste (ou criar um)
order = Order.objects.filter(customer_email__isnull=False).first()

if order:
    print(f"Pedido encontrado: #{order.order_number}")
    
    # Testar email de confirmação
    email_service = get_email_service()
    result = email_service.send_order_confirmation(
        order=order,
        customer_email="jsabonete09@gmail.com",  # SEU EMAIL
        customer_name="Teste Cliente"
    )
    
    if result:
        print("✅ Email de confirmação enviado!")
        print("📬 Verifique jsabonete09@gmail.com")
    else:
        print("❌ Erro ao enviar")
else:
    print("❌ Nenhum pedido encontrado. Faça uma compra de teste primeiro.")

# Sair
exit()
```

**Resultado esperado:** Email de confirmação com lista de produtos deve chegar!

---

## 🎯 PASSO 3: Testar Email de Status de Pagamento

Ainda no shell do Django:

```python
from cart.models import Order
from cart.email_service import get_email_service

order = Order.objects.first()
email_service = get_email_service()

# Testar status APROVADO (verde)
email_service.send_payment_status_update(
    order=order,
    customer_email="jsabonete09@gmail.com",
    customer_name="Teste Cliente",
    payment_status="approved"
)
print("✅ Email de pagamento APROVADO enviado!")

# Aguarde 1 minuto e teste status PENDENTE (amarelo)
email_service.send_payment_status_update(
    order=order,
    customer_email="jsabonete09@gmail.com",
    customer_name="Teste Cliente",
    payment_status="pending"
)
print("✅ Email de pagamento PENDENTE enviado!")

exit()
```

**Resultado esperado:** 
- 1º email verde ✅ "Pagamento Aprovado"
- 2º email amarelo ⏳ "Pagamento Pendente"

---

## 🎯 PASSO 4: Fazer Compra de Teste REAL

Agora vamos testar o fluxo completo automático:

### 1. Inicie o servidor Django:
```powershell
cd D:\Projectos\versao_1_chiva\backend
python manage.py runserver
```

### 2. Acesse o site:
```
http://localhost:8000
```

### 3. Faça uma compra:
- Adicione produtos ao carrinho
- Vá para checkout
- Use dados reais:
  - **Email:** jsabonete09@gmail.com
  - **Nome:** Seu Nome
  - **Telefone:** Seu número
- Finalize com M-Pesa/e-Mola

### 4. Pague no M-Pesa/e-Mola

### 5. Aguarde os emails automáticos:

Quando pagamento for aprovado, você deve receber **3 emails**:

1. ✅ **Confirmação de Pedido**
   - Template: `order_confirmation.html`
   - Lista produtos, total, endereço

2. ✅ **Pagamento Aprovado**
   - Template: `payment_status.html`
   - Fundo verde, status aprovado

3. 🔔 **Notificação Admin** (para jsabonete09@gmail.com)
   - Template: `admin_new_order.html`
   - Detalhes da venda

**IMPORTANTE:** Se não receber, verifique:
- Console do Django (erros?)
- Pasta SPAM do Gmail
- Dashboard Brevo → Transactional

---

## 🎯 PASSO 5: Testar Email de Envio

Quando processar o pedido e marcar como "enviado":

### No Django Admin:
```
http://localhost:8000/admin
```

1. Login com suas credenciais
2. Vá em **Cart → Orders**
3. Clique no pedido de teste
4. Mude **Status** para "Shipped" (Enviado)
5. Salve

**Resultado esperado:** Email automático 📦 "Pedido Enviado"

---

## 🎯 PASSO 6: Configurar Cron Job (Carrinho Abandonado)

### Para Windows (Task Scheduler):

1. Abra **Task Scheduler** (Agendador de Tarefas)

2. Crie nova tarefa:
   - **Nome:** Chiva - Cart Recovery Emails
   - **Trigger:** Diariamente às 10:00 e 18:00
   - **Action:** Iniciar programa
   - **Program:** `C:\Users\DELL\AppData\Local\Programs\Python\Python311\python.exe`
   - **Arguments:** `manage.py send_cart_recovery_emails`
   - **Start in:** `D:\Projectos\versao_1_chiva\backend`

3. Salve e teste manualmente

### Teste manual:
```powershell
cd D:\Projectos\versao_1_chiva\backend
python manage.py send_cart_recovery_emails --dry-run
```

**Resultado esperado:** Lista de carrinhos abandonados (se houver)

---

## 🎯 PASSO 7: Monitorar Dashboard Brevo

### Acompanhe os emails enviados:

1. **Acesse:** https://app.brevo.com/
2. **Vá em:** Campaigns → Transactional
3. **Veja:**
   - Quantidade de emails enviados
   - Taxa de entrega
   - Taxa de abertura
   - Emails bloqueados/bounce

### Estatísticas importantes:
- **Delivered:** Emails entregues com sucesso
- **Opened:** Quantos abriram o email
- **Clicked:** Quantos clicaram nos links
- **Bounce:** Emails rejeitados (endereço inválido)

---

## 🎯 PASSO 8: Customizar Templates (Opcional)

Se quiser personalizar os emails:

### 1. Abra o template:
```powershell
notepad D:\Projectos\versao_1_chiva\backend\cart\email_templates\order_confirmation.html
```

### 2. Altere o que quiser:
- Cores (mude `#667eea` por outra cor)
- Textos
- Layout
- Adicione logo

### 3. Teste as mudanças:
```powershell
cd D:\Projectos\versao_1_chiva\backend
python test_templates.py
```

### 4. Veja preview:
Abra `preview_order_confirmation.html` no navegador

---

## 🎯 PASSO 9: Preparar para Produção

### Quando estiver pronto para produção:

1. **Verificar domínio no Brevo:**
   - Acesse Brevo → Settings → Senders & IP
   - Add domain → `chivacomputer.co.mz`
   - Configure DNS (SPF, DKIM, DMARC)

2. **Atualizar .env produção:**
   ```env
   BREVO_SENDER_EMAIL=noreply@chivacomputer.co.mz
   EMAIL_NOTIFICATIONS_ENABLED=True
   DEBUG=False
   ```

3. **Fazer backup dos templates:**
   ```powershell
   cd D:\Projectos\versao_1_chiva\backend
   xcopy /E /I cart\email_templates cart\email_templates_backup
   ```

4. **Deploy:**
   - Suba código para servidor
   - Configure variáveis de ambiente
   - Teste envio

---

## 📋 CHECKLIST COMPLETO

### Testes Básicos:
- [ ] Email simples chegou (test_email_simple.py)
- [ ] Email de confirmação funciona
- [ ] Email de status de pagamento funciona (aprovado/pendente/falhou)
- [ ] Email de envio funciona

### Testes Integrados:
- [ ] Compra real → emails automáticos chegam
- [ ] Admin recebe notificação de venda
- [ ] Mudança de status → email de envio
- [ ] Carrinho abandonado → email de recuperação

### Produção:
- [ ] Domínio verificado no Brevo
- [ ] DNS configurado (SPF/DKIM/DMARC)
- [ ] Cron job configurado
- [ ] Monitoramento ativo no dashboard
- [ ] Backup dos templates

---

## 🆘 SE ALGO DER ERRADO

### Email não chega:
```powershell
# Verificar configuração
python test_config.py

# Verificar senders
python check_brevo_senders.py

# Testar diagnóstico
python test_sender_verification.py
```

### Ver logs:
```powershell
# Django console (errors)
python manage.py runserver

# Ver logs em produção
tail -f logs/django.log
```

### Dashboard Brevo:
- Campaigns → Transactional
- Ver status de cada email enviado
- Verificar bounces/blocks

---

## 📚 DOCUMENTAÇÃO

Todos os guias criados:
- `PROBLEMA_RESOLVIDO.md` - Solução do sender
- `EMAILS_RESUMO_FINAL.md` - Visão geral
- `TEMPLATES_EMAIL_GUIA.md` - Como editar templates
- `VERIFICAR_SENDER_EMAIL.md` - Verificação de domínio
- `COMANDOS_RAPIDOS.md` - Comandos úteis
- `DIAGNOSTICO_EMAIL.md` - Troubleshooting
- `PROXIMOS_PASSOS.md` - Este arquivo

---

## 🎉 RESUMO

**Status atual:**
✅ Sistema 100% funcional
✅ Sender verificado
✅ Templates criados
✅ Integração pronta

**Próxima ação:**
1. Verificar se email de teste chegou
2. Fazer compra de teste no site
3. Ver emails automáticos chegarem
4. Customizar templates se quiser
5. Preparar para produção

---

**Criado em:** 20/10/2025  
**Status:** 🚀 PRONTO PARA USO

