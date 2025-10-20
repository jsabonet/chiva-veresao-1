# 🔧 GUIA: Verificar Sender Email no Brevo

## ⚠️ PROBLEMA IDENTIFICADO

O teste mostra "Email enviado com sucesso" mas você não recebe porque:
- O email `noreply@chivacomputer.co.mz` **NÃO está verificado** no Brevo
- Brevo aceita a chamada da API mas **NÃO envia** emails de senders não verificados

## ✅ SOLUÇÃO RÁPIDA (Para Testes)

### Opção 1: Use seu email pessoal (RECOMENDADO para testes)

1. Edite o arquivo `.env`:
```env
BREVO_SENDER_EMAIL=jsabonete09@gmail.com
BREVO_SENDER_NAME=Chiva Computer
```

2. Execute novamente:
```bash
cd D:\Projectos\versao_1_chiva\backend
python test_email_simple.py
```

3. Agora o email DEVE chegar porque `jsabonete09@gmail.com` já está verificado no Brevo (é o email da conta)

---

## ✅ SOLUÇÃO DEFINITIVA (Para Produção)

### Verificar domínio próprio no Brevo

1. **Acesse Brevo Dashboard:**
   - Login em https://app.brevo.com/
   - Vá em **Settings → Senders & IP**

2. **Adicione o domínio:**
   - Clique em **Add a domain**
   - Digite: `chivacomputer.co.mz`

3. **Configure DNS Records:**
   Brevo vai mostrar 3 registros DNS que você precisa adicionar no seu provedor de domínio:
   
   ```
   TXT  @  "brevo-code=XXXXXXXX"
   TXT  _dmarc.chivacomputer.co.mz  "v=DMARC1; p=none"
   TXT  mail._domainkey.chivacomputer.co.mz  "v=DKIM1; k=rsa; p=XXXXXXXX..."
   ```

4. **Aguarde verificação:**
   - Leva de 15 minutos até 48 horas
   - Após verificado, pode usar `noreply@chivacomputer.co.mz`

---

## 🧪 TESTAR NOVAMENTE

### Com email pessoal (solução rápida):

```bash
cd D:\Projectos\versao_1_chiva\backend
python test_email_simple.py
```

### Com todos os tipos de email:

```bash
python test_email_system.py
```

---

## 📋 CHECKLIST

- [ ] Editei `.env` com email verificado
- [ ] Executei `python test_email_simple.py`
- [ ] Recebi o email de teste
- [ ] Configurei DNS do domínio (opcional, para produção)
- [ ] Testei todos os tipos de email

---

## 🆘 AINDA NÃO RECEBEU?

### Verifique:

1. **Pasta de Spam/Lixo Eletrônico**
   - Emails de teste podem ir para spam

2. **Logs do Brevo:**
   - Dashboard → Campaigns → Transactional
   - Veja se o email aparece como "sent" ou "blocked"

3. **Teste com outro email:**
   ```python
   # Em test_email_simple.py, troque para:
   test_email = "outro_email@gmail.com"
   ```

---

## 💡 DICA PRO

Use o **email pessoal verificado** para desenvolvimento/testes e configure o **domínio próprio** antes do lançamento em produção.

