# 🎨 Guia Visual - Configuração do Brevo (Sendinblue)

## 📋 Passo a Passo Completo

### 1️⃣ CRIAR CONTA GRÁTIS

1. **Acesse:** https://www.brevo.com
2. **Clique em:** "Sign up free" (canto superior direito)
3. **Preencha os dados:**
   ```
   Email: seu_email@example.com
   Senha: ******** (mínimo 8 caracteres)
   Company name: Chiva Computer
   ```
4. **Selecione:**
   - País: Moçambique
   - Número de contatos: 0-500
   - Tipo de negócio: E-commerce
5. **Clique em:** "Create your account"
6. **Verifique seu email** e clique no link de confirmação

---

### 2️⃣ OBTER API KEY

1. **Faça login em:** https://app.brevo.com
2. **No menu superior direito**, clique no seu nome → **"SMTP & API"**
   ```
   Ou acesse direto: https://app.brevo.com/settings/keys/api
   ```
3. **Clique em:** "Create a new API key"
4. **Nome da key:** `Chiva Computer Production API`
5. **Clique em:** "Generate"
6. **⚠️ IMPORTANTE:** Copie a API Key AGORA!
   ```
   Exemplo: xkeysib-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
   ```
   Você NÃO poderá ver novamente depois!
7. **Cole no arquivo `.env`:**
   ```env
   BREVO_API_KEY=xkeysib-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
   ```

---

### 3️⃣ CONFIGURAR SENDER EMAIL

#### Opção A: Usar Email Temporário (Mais Rápido)

1. **No Brevo Dashboard**, vá em **"Settings"** → **"Senders"**
2. **Clique em:** "Add a sender"
3. **Preencha:**
   ```
   Email: seu_email_pessoal@gmail.com
   Name: Chiva Computer
   ```
4. **Clique em:** "Save"
5. **Verifique o email** que o Brevo enviou para você
6. **Clique no link** de confirmação

✅ **Pronto!** Você pode começar a enviar emails agora!

**Configurar no `.env`:**
```env
BREVO_SENDER_EMAIL=seu_email_pessoal@gmail.com
BREVO_SENDER_NAME=Chiva Computer
```

#### Opção B: Usar Domínio Próprio (Mais Profissional)

1. **No Brevo Dashboard**, vá em **"Settings"** → **"Senders"**
2. **Clique em:** "Add a sender"
3. **Preencha:**
   ```
   Email: noreply@chivacomputer.co.mz
   Name: Chiva Computer
   ```
4. **Clique em:** "Save"
5. **Brevo mostrará:** "Domain not verified" ⚠️
6. **Clique em:** "Verify domain"

7. **Configure DNS** no seu provedor (Cloudflare/GoDaddy):
   
   Adicione estes registros DNS:
   
   **SPF Record:**
   ```
   Tipo: TXT
   Nome: @
   Valor: v=spf1 include:spf.sendinblue.com ~all
   ```
   
   **DKIM Record:**
   ```
   Tipo: TXT
   Nome: mail._domainkey
   Valor: [copiado do Brevo]
   ```

8. **Aguarde** 24-48h para propagação DNS
9. **Volte ao Brevo** e clique em "Check DNS"
10. **Status:** ✅ "Domain verified"

**Configurar no `.env`:**
```env
BREVO_SENDER_EMAIL=noreply@chivacomputer.co.mz
BREVO_SENDER_NAME=Chiva Computer
```

---

### 4️⃣ VERIFICAR CONFIGURAÇÃO

#### No Dashboard do Brevo:

1. **Vá em:** "Settings" → "SMTP & API"
2. **Verifique:**
   - ✅ API Key criada
   - ✅ Status: Active

3. **Vá em:** "Settings" → "Senders"
   - ✅ Sender email adicionado
   - ✅ Status: Verified (ou Unverified se usando email pessoal)

#### No Projeto Django:

```bash
cd backend
python manage.py shell
```

```python
from cart.email_service import get_email_service

email_service = get_email_service()

print("✅ Configuração:")
print(f"  Habilitado: {email_service.enabled}")
print(f"  API Key: {email_service.api_key[:20]}...")
print(f"  Sender: {email_service.sender_email}")
```

---

### 5️⃣ ENVIAR EMAIL DE TESTE

```bash
cd backend
python test_email_system.py
```

**Antes de executar:**
1. Abra `test_email_system.py`
2. **Mude** `teste@example.com` para **SEU EMAIL REAL**
3. Salve o arquivo
4. Execute o script

**Resultado esperado:**
```
✅ Email de confirmação enviado com sucesso!
✅ Email de status enviado com sucesso!
✅ Email de recuperação enviado com sucesso!
✅ Email para admin enviado com sucesso!

🎉 Todos os testes passaram!
```

**Verifique sua caixa de entrada!** 📧

---

## 📊 DASHBOARD DO BREVO

### Estatísticas (https://app.brevo.com/statistics/transactional)

Você verá:
- 📨 **Emails enviados** (total e por dia)
- 📊 **Taxa de abertura** (quantos % abriram)
- 🖱️ **Taxa de cliques** (quantos % clicaram em links)
- ⚠️ **Bounces** (emails inválidos)
- 🚫 **Spam reports** (marcados como spam)

### Logs (https://app.brevo.com/logs)

Ver todos os emails enviados:
- ✅ **Delivered** (entregue)
- 📬 **Opened** (aberto)
- 🖱️ **Clicked** (clicou em link)
- ⚠️ **Bounced** (falhou)
- 🚫 **Unsubscribed** (cancelou inscrição)

### Limite Diário

No canto superior:
```
📊 Usage today: 15 / 300 emails
```

---

## 🎯 TROUBLESHOOTING VISUAL

### ❌ "API key is invalid"

**Causa:** API Key incorreta ou expirada

**Solução:**
1. Vá em: Settings → SMTP & API → API Keys
2. Verifique se a key está "Active"
3. Se necessário, gere uma nova key
4. Atualize no `.env`
5. Reinicie o servidor Django

---

### ❌ "Sender not verified"

**Causa:** Email sender não foi verificado

**Solução Rápida:**
1. Settings → Senders
2. Use um email pessoal (Gmail/Outlook)
3. Verifique o email de confirmação

**Solução Profissional:**
1. Settings → Senders
2. Clique em "Verify domain"
3. Configure DNS records
4. Aguarde 24-48h

---

### ❌ Emails vão para SPAM

**Causa:** Domínio não autenticado ou conteúdo suspeito

**Soluções:**
1. **Autenticar domínio:**
   - Settings → Senders → Verify domain
   - Adicionar SPF e DKIM no DNS

2. **Melhorar conteúdo:**
   - Evitar: "GRÁTIS", "CLIQUE AQUI", "URGENTE"
   - Balancear texto e imagens
   - Incluir link de unsubscribe

3. **Testar deliverability:**
   - https://www.mail-tester.com
   - Envie email para o endereço fornecido
   - Ver score e sugestões

---

### ⚠️ "Daily limit reached"

**Causa:** Atingiu 300 emails/dia

**Soluções:**
1. **Esperar até amanhã** (limite reseta à meia-noite UTC)

2. **Otimizar envios:**
   - Reduzir emails de recuperação
   - Agrupar notificações

3. **Upgrade para plano pago:**
   - Settings → Subscription
   - Plano Starter: €25/mês = 20.000 emails

---

## 📱 APP MOBILE DO BREVO

**iOS:** https://apps.apple.com/app/sendinblue/id1448412104
**Android:** https://play.google.com/store/apps/details?id=com.sendinblue.app

Acompanhe estatísticas em tempo real no celular! 📊

---

## 🔔 NOTIFICAÇÕES

### Configurar Alertas

1. **Settings** → **Notifications**
2. **Ative:**
   - ✅ Daily email sending report
   - ✅ Sender reputation alerts
   - ✅ API key usage warnings
3. **Email para alertas:**
   ```
   admin@chivacomputer.co.mz
   ```

---

## 🎨 TEMPLATES NO BREVO (Opcional)

Se quiser usar templates do Brevo (não necessário):

1. **Campaigns** → **Templates**
2. **Create a new template**
3. **Usar drag-and-drop editor**
4. **Salvar template**
5. **Usar ID do template no código:**

```python
# Em email_service.py
send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
    to=[{"email": to_email, "name": to_name}],
    template_id=1,  # ID do template
    params={
        'ORDER_NUMBER': order.order_number,
        'TOTAL': order.total_amount
    }
)
```

---

## 📞 SUPORTE BREVO

- **Help Center:** https://help.brevo.com
- **API Docs:** https://developers.brevo.com
- **Status Page:** https://status.brevo.com
- **Chat Support:** No dashboard (canto inferior direito)

---

## ✅ CHECKLIST VISUAL

### Setup Inicial:
- [ ] Conta criada no Brevo
- [ ] Email de confirmação verificado
- [ ] API Key gerada e copiada
- [ ] Sender email configurado
- [ ] Sender email verificado
- [ ] API Key adicionada no `.env`
- [ ] Dependências instaladas (`pip install`)
- [ ] Teste executado com sucesso
- [ ] Email de teste recebido
- [ ] Dashboard verificado

### Configuração Avançada (Opcional):
- [ ] Domínio verificado (SPF/DKIM)
- [ ] Templates personalizados criados
- [ ] Notificações configuradas
- [ ] App mobile instalado
- [ ] Cron job configurado

---

## 🎉 PRONTO PARA USAR!

Agora você tem:
- ✅ Conta Brevo configurada
- ✅ API funcionando
- ✅ Emails sendo enviados
- ✅ Dashboard para monitorar
- ✅ 300 emails/dia grátis

**Próximo passo:** Fazer uma compra de teste e verificar se os emails estão sendo enviados automaticamente! 🚀

---

**Dúvidas?** Consulte `SISTEMA_NOTIFICACOES_EMAIL.md` para documentação completa!
