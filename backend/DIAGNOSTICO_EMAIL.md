# 🔍 DIAGNÓSTICO: Email não está chegando

## ✅ O que funciona:
- ✅ API Key válida
- ✅ Brevo ACEITOU o email (Message ID: `202510201539.21336179435@smtp-relay.mailin.fr`)
- ✅ Sender configurado: `noreply@chivacomputer.co.mz`

## ⚠️ Possíveis causas:

### 1. Email está indo para SPAM 📬
**Mais provável!** Emails de domínios novos/não verificados frequentemente vão para spam.

**Como verificar:**
1. Abra Gmail: jsabonete09@gmail.com
2. Clique em **"Spam"** ou **"Lixo Eletrônico"** na barra lateral
3. Procure por emails de "Chiva Computer" ou "noreply@chivacomputer.co.mz"

**Se estiver lá:**
- Marque como "Não é spam"
- Mova para caixa de entrada
- Emails futuros devem chegar na caixa principal

---

### 2. Domínio sem autenticação SPF/DKIM 🔐
O domínio `chivacomputer.co.mz` pode não ter registros DNS de autenticação.

**Verificar no Brevo:**
1. Acesse: https://app.brevo.com/
2. Vá em: **Settings → Senders & IP**
3. Procure por `chivacomputer.co.mz` ou `noreply@chivacomputer.co.mz`
4. Veja se há um ícone de verificação ✅ ou aviso ⚠️

**Se aparecer aviso de autenticação:**
- O domínio precisa de registros SPF/DKIM/DMARC
- Emails podem ser bloqueados por provedores
- Ver solução abaixo

---

### 3. Atraso na entrega ⏰
Às vezes Brevo/Gmail tem atrasos.

**O que fazer:**
- Aguarde 5-10 minutos
- Verifique novamente caixa de entrada e spam

---

### 4. Email bloqueado pelo Gmail 🚫
Gmail pode estar bloqueando emails do domínio novo.

**Como verificar no Brevo Dashboard:**
1. Acesse: https://app.brevo.com/
2. Vá em: **Campaigns → Transactional**
3. Procure pelo email com ID: `202510201539.21336179435@smtp-relay.mailin.fr`
4. Veja o status:
   - ✅ **Sent** → Foi enviado
   - ✅ **Delivered** → Foi entregue (deve estar em algum lugar!)
   - ⚠️ **Soft Bounce** → Erro temporário
   - ❌ **Hard Bounce** → Erro permanente
   - ⏳ **Pending** → Ainda processando

---

## 🔧 SOLUÇÕES

### Solução 1: Usar email da conta Brevo (IMEDIATO)

**Mais rápido para testes:**

1. Edite `.env`:
```env
BREVO_SENDER_EMAIL=jsabonete09@gmail.com
BREVO_SENDER_NAME=Chiva Computer
```

2. Teste novamente:
```powershell
cd D:\Projectos\versao_1_chiva\backend
python test_sender_verification.py
```

**Vantagem:**
- ✅ Email chega IMEDIATAMENTE
- ✅ Não vai para spam
- ✅ Funciona 100%

**Desvantagem:**
- ⚠️ Replies vão para jsabonete09@gmail.com (não para noreply)

---

### Solução 2: Autenticar domínio no Brevo (PRODUÇÃO)

**Para emails profissionais de noreply@chivacomputer.co.mz:**

1. **Acesse Brevo:**
   - https://app.brevo.com/
   - Settings → Senders & IP

2. **Adicione domínio:**
   - Clique em **"Add a domain"**
   - Digite: `chivacomputer.co.mz`

3. **Configure DNS:**
   Brevo vai mostrar 3 registros para adicionar no seu provedor de domínio:

   ```
   Tipo: TXT
   Host: @
   Valor: brevo-code=XXXXXXXXXXXXXXXX

   Tipo: TXT
   Host: _dmarc
   Valor: v=DMARC1; p=none; rua=mailto:admin@chivacomputer.co.mz

   Tipo: TXT
   Host: mail._domainkey
   Valor: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4...
   ```

4. **Adicione no provedor de domínio:**
   - Acesse painel do provedor onde comprou `chivacomputer.co.mz`
   - Vá em DNS Settings / Zona DNS
   - Adicione os 3 registros TXT fornecidos pelo Brevo
   - Salve

5. **Aguarde verificação:**
   - Volta no Brevo → Settings → Senders & IP
   - Clique em **"Verify"**
   - Pode levar de 15 minutos até 48 horas

6. **Depois de verificado:**
   - Emails de `noreply@chivacomputer.co.mz` vão chegar normalmente
   - Não vão mais para spam
   - Domínio autenticado ✅

---

### Solução 3: Adicionar sender individual (RÁPIDO)

**Se não conseguir configurar DNS do domínio agora:**

1. **Acesse Brevo:**
   - https://app.brevo.com/
   - Settings → Senders & IP

2. **Adicione sender:**
   - Clique em **"Add a Sender"**
   - Email: `noreply@chivacomputer.co.mz`
   - Name: `Chiva Computer`

3. **Verificação por email:**
   - Brevo vai enviar email de verificação para `noreply@chivacomputer.co.mz`
   - **PROBLEMA:** Você precisa ter acesso a esse email para verificar!
   - Se não tiver acesso, use Solução 1

---

## 🎯 RECOMENDAÇÃO

### Para TESTES (agora):
✅ **Use Solução 1** → `BREVO_SENDER_EMAIL=jsabonete09@gmail.com`
- Funciona imediatamente
- Sem configuração DNS
- 100% confiável

### Para PRODUÇÃO (depois):
✅ **Use Solução 2** → Autenticar domínio `chivacomputer.co.mz`
- Emails profissionais
- Não vai para spam
- Mais confiável

---

## 📝 CHECKLIST DE VERIFICAÇÃO

Faça isso AGORA:

- [ ] Verificar pasta SPAM do Gmail (jsabonete09@gmail.com)
- [ ] Verificar dashboard Brevo → Transactional (status do email)
- [ ] Se não encontrar, usar Solução 1 (jsabonete09@gmail.com)
- [ ] Testar novamente com `python test_sender_verification.py`
- [ ] Verificar se chegou (deve chegar em segundos)

---

## 🆘 SE AINDA NÃO FUNCIONAR

Execute estes comandos e me mostre o resultado:

```powershell
cd D:\Projectos\versao_1_chiva\backend
python test_sender_verification.py
```

E verifique:
1. ✅ Pasta SPAM do Gmail
2. ✅ Dashboard Brevo (status do email)
3. ✅ Se mudou para jsabonete09@gmail.com no .env

---

**Criado em:** 20/10/2025  
**Status:** 🔍 Investigando entrega
