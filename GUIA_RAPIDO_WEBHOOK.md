# 🎯 GUIA RÁPIDO: Por Que o Status Não Atualiza

## ❌ PROBLEMA

Pagamento falhou (falta de saldo), mas status continua `pending` ao invés de mudar para `failed`.

## 🔍 CAUSA

**O webhook do PaySuite NÃO está chegando ao seu servidor!**

### Por Quê?

O dashboard do PaySuite está configurado para enviar webhooks para:
```
❌ http://127.0.0.1:8000/api/cart/payments/webhook/
```

Isso é **localhost** - só funciona na máquina do PaySuite, não no seu servidor!

## ✅ SOLUÇÃO (5 Minutos)

### Passo 1: Acessar Dashboard do PaySuite

1. Ir para: https://paysuite.tech/dashboard
2. Fazer login
3. Procurar por uma dessas opções:
   - **Settings** → **Webhooks**
   - **API** → **Webhooks**  
   - **Developers** → **Webhooks**
   - **Configurações** → **Webhooks**

### Passo 2: Encontrar a URL Atual

Você verá algo como:
```
Webhook URL: http://127.0.0.1:8000/api/cart/payments/webhook/
```

### Passo 3: Mudar para URL de Produção

Substituir por:
```
https://chivacomputer.co.mz/api/cart/payments/webhook/
```

### Passo 4: Salvar

Clicar em **Salvar** ou **Save** ou **Atualizar**.

### Passo 5: Testar (Opcional)

Se o dashboard tiver botão "Test Webhook" ou "Testar", clique para verificar.

## 🧪 COMO TESTAR SE FUNCIONOU

### Fazer Novo Pagamento

1. Criar novo pedido no site
2. Selecionar M-Pesa
3. Deixar falhar (sem saldo) OU completar
4. Aguardar 10 segundos
5. Status deve atualizar automaticamente!

### Verificar Logs (No Servidor)

```bash
ssh root@157.230.16.193
docker compose logs -f backend | grep "Webhook"
```

**Esperado:**
```
🔔 Webhook received: event=payment.failed, payment_id=11
✅ Synced order 11 status: pending → failed
```

## 📸 O QUE PROCURAR NO DASHBOARD

O dashboard pode parecer assim:

```
┌─────────────────────────────────────────────┐
│ Webhook Settings                            │
├─────────────────────────────────────────────┤
│                                             │
│ Webhook URL:                                │
│ ┌─────────────────────────────────────────┐ │
│ │ http://127.0.0.1:8000/api/cart/...     │ │ ← MUDAR ISSO!
│ └─────────────────────────────────────────┘ │
│                                             │
│ Webhook Secret:                             │
│ ┌─────────────────────────────────────────┐ │
│ │ whsec_cd0a9e1a17e2d5d2a7cc...          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Events:                                     │
│ ☑ payment.success                           │
│ ☑ payment.failed                            │
│ ☑ payment.pending                           │
│                                             │
│          [Test Webhook]  [Save Settings]    │
└─────────────────────────────────────────────┘
```

**Mudar a Webhook URL para:**
```
https://chivacomputer.co.mz/api/cart/payments/webhook/
```

## ⚡ CHECKLIST RÁPIDO

- [ ] ✅ Acessei dashboard PaySuite
- [ ] ✅ Encontrei configuração de webhooks
- [ ] ✅ Mudei URL de localhost para chivacomputer.co.mz
- [ ] ✅ Salvei as configurações
- [ ] ✅ (Opcional) Testei webhook
- [ ] ✅ Fiz novo pagamento de teste
- [ ] ✅ Status atualizou automaticamente!

## 🆘 SE NÃO CONSEGUIR ENCONTRAR

Tente procurar por:
- "Webhook"
- "API Settings"
- "Developer Settings"
- "Integration"
- "Notifications"
- "Callbacks"

Ou entre em contato com suporte do PaySuite e peça para atualizar a webhook URL para:
```
https://chivacomputer.co.mz/api/cart/payments/webhook/
```

---

**Tempo Estimado:** 5 minutos  
**Dificuldade:** Fácil  
**Impacto:** 🔥 CRÍTICO - Resolve TODOS os problemas de status!
