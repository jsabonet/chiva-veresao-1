# 🎨 Diagrama Visual: Sistema de Pagamentos

## 📊 Fluxo Completo de Pagamento

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                 FLUXO DE PAGAMENTO CHIVA                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────┐
│   USUÁRIO   │  1. Navega e adiciona produtos ao carrinho
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite)                    │
│                                                             │
│  Cart.tsx → Checkout.tsx → OrderConfirmation.tsx          │
│                                                             │
│  📱 UI Components:                                          │
│  • Carrinho de compras                                     │
│  • Seleção de método de pagamento (M-Pesa/e-Mola)         │
│  • Formulário de endereço de envio                        │
│  • Página de confirmação com polling                       │
└──────┬──────────────────────────────────────────────────────┘
       │ 2. POST /api/cart/payments/initiate/
       ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Django + DRF)                         │
│                                                             │
│  views.py::initiate_payment()                              │
│  ├─ Cria Payment record (status='pending')                 │
│  ├─ Cria Order provisório (status='pending')               │
│  ├─ Configura callback_url usando WEBHOOK_BASE_URL         │
│  └─ Chama Paysuite API                                     │
│                                                             │
│  ⚙️  CONFIGURAÇÃO CRÍTICA:                                 │
│  WEBHOOK_BASE_URL = https://seu-dominio.com (produção)     │
│                    https://abc.ngrok-free.app (dev)        │
└──────┬──────────────────────────────────────────────────────┘
       │ 3. Cria checkout session
       ↓
┌─────────────────────────────────────────────────────────────┐
│             PAYSUITE GATEWAY (Externo)                      │
│                                                             │
│  • Recebe requisição de pagamento                          │
│  • Retorna checkout_url                                    │
│  • Redireciona usuário para página de pagamento           │
└──────┬──────────────────────────────────────────────────────┘
       │ 4. Redireciona para checkout
       ↓
┌─────────────┐
│   USUÁRIO   │  5. Paga via M-Pesa ou e-Mola
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────────────────────────┐
│         PAYSUITE (Processa Pagamento)                       │
│                                                             │
│  • Valida pagamento                                        │
│  • Determina status: success ou failed                     │
│  • Envia webhook para callback_url                         │
└──────┬──────────────────────────────────────────────────────┘
       │ 6. POST /api/cart/payments/webhook/
       │    (event: payment.success ou payment.failed)
       ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Webhook Handler)                      │
│                                                             │
│  views.py::paysuite_webhook()                              │
│  ├─ Valida webhook (signature se configurado)              │
│  ├─ Busca Payment por reference                            │
│  ├─ Atualiza Payment.status                                │
│  │   • payment.success → status='paid'                     │
│  │   • payment.failed → status='failed'                    │
│  ├─ Atualiza Order.status (via OrderManager)               │
│  └─ Limpa Cart se status='paid'                            │
│                                                             │
│  📝 LOGS:                                                   │
│  🔔 Webhook received: event=payment.success               │
│  📦 Order #ORD-000142 status: pending → paid              │
└──────┬──────────────────────────────────────────────────────┘
       │ Status atualizado no banco de dados
       │
       ↓
┌─────────────────────────────────────────────────────────────┐
│               DATABASE (PostgreSQL/SQLite)                  │
│                                                             │
│  Order: id=142, status='paid', user=joel@example.com       │
│  Payment: id=143, status='paid', method='mpesa'            │
└──────┬──────────────────────────────────────────────────────┘
       │ Polling detecta mudança
       ↑
┌─────────────────────────────────────────────────────────────┐
│            FRONTEND (Polling Mechanism)                     │
│                                                             │
│  OrderConfirmation.tsx::poll()                             │
│  ├─ GET /api/cart/payments/status/{order_id}/              │
│  ├─ Executado a cada 3 segundos                            │
│  ├─ Timeout: 2 minutos                                     │
│  └─ Atualiza estado React com novo status                  │
│                                                             │
│  📊 LOGS:                                                   │
│  📊 Poll Response: {order_status: 'paid', ...}             │
└──────┬──────────────────────────────────────────────────────┘
       │ 7. UI atualiza automaticamente
       ↓
┌─────────────────────────────────────────────────────────────┐
│                UI (React State Update)                      │
│                                                             │
│  status='paid' → Renderiza:                                │
│  ✅ Borda verde                                            │
│  ✅ Ícone de checkmark grande                              │
│  ✅ Mensagem "Pagamento Aprovado!"                         │
│  ✅ Detalhes do pedido                                     │
│  ✅ Botões: "Ver pedido" | "Continuar comprando"          │
│                                                             │
│  status='failed' → Renderiza:                              │
│  ❌ Borda vermelha                                         │
│  ❌ Ícone X grande                                          │
│  ❌ Mensagem "Pagamento Recusado"                          │
│  ❌ Instruções de como tentar novamente                    │
│  ❌ Botões: "Voltar ao carrinho" | "Voltar à loja"        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Pontos Críticos do Sistema

### 1️⃣ WEBHOOK_BASE_URL (MAIS IMPORTANTE!)

```
❌ ERRADO:  WEBHOOK_BASE_URL=http://localhost:8000
           (Paysuite não consegue alcançar)

✅ CERTO:   WEBHOOK_BASE_URL=https://abc.ngrok-free.app (dev)
           WEBHOOK_BASE_URL=https://api.chivacomputer.co.mz (produção)
```

**Por quê?**
- Paysuite é servidor externo na internet
- `localhost` só existe na sua máquina
- Precisa URL pública acessível de qualquer lugar

---

### 2️⃣ Polling Mechanism

```javascript
// Frontend consulta status a cada 3 segundos
setInterval(() => {
  fetchPaymentStatus(orderId);  // GET /api/cart/payments/status/142/
}, 3000);

// Timeout após 2 minutos
setTimeout(() => {
  clearInterval(polling);
  showTimeoutError();
}, 120000);
```

**Por quê?**
- Webhook pode demorar (1-10 segundos normalmente)
- Usuário não recarrega página manualmente
- UI atualiza automaticamente quando status muda

---

### 3️⃣ Cart Management

```python
# backend/cart/views.py (webhook handler)

if payment.status == 'paid':
    # Limpar cart apenas quando confirmado
    cart.items.all().delete()
    cart.status = 'converted'
    cart.save()
else:
    # Manter cart se falhou (permite retry)
    pass
```

**Por quê?**
- Usuário pode tentar novamente se pagamento falhar
- Não perder produtos do carrinho prematuramente
- Melhor experiência do usuário

---

## 🔄 Estados do Pedido

```
┌─────────────────────────────────────────────────────────────┐
│                  MÁQUINA DE ESTADOS                         │
└─────────────────────────────────────────────────────────────┘

    [Usuário clica "Finalizar"]
              │
              ↓
        ┌──────────┐
        │ PENDING  │ ← Estado inicial (Order e Payment criados)
        └────┬─────┘
             │
             │ [Webhook chega do Paysuite]
             │
        ┌────┴─────┐
        │          │
        ↓          ↓
   ┌─────┐    ┌────────┐
   │PAID │    │ FAILED │
   └─────┘    └────────┘
      │            │
      │            │
      ↓            ↓
  ✅ Sucesso   ❌ Retry
  Cart limpo   Cart mantido
  Email enviado
```

---

## 🌐 Ambientes

### Desenvolvimento Local

```
┌──────────────┐         ┌──────────┐         ┌──────────────┐
│   Frontend   │────────→│  Backend │────────→│   Paysuite   │
│ localhost:   │         │ localhost│         │  (Internet)  │
│   5173       │         │   :8000  │         │              │
└──────────────┘         └─────┬────┘         └──────┬───────┘
                               │                     │
                               │    ┌───────────┐    │
                               │    │   ngrok   │←───┘
                               │    │  (Túnel)  │
                               │    └─────┬─────┘
                               │          │
                               └──────────┘
                             Webhook chega!
```

### Produção

```
┌──────────────┐         ┌──────────────┐         ┌──────────┐
│   Frontend   │────────→│   Backend    │────────→│ Paysuite │
│ chiva.co.mz  │         │ api.chiva.   │         │ Gateway  │
│              │         │   co.mz      │         │          │
└──────────────┘         └──────┬───────┘         └────┬─────┘
                                │                      │
                                │    Webhook HTTPS     │
                                └──────────────────────┘
                                  Funciona direto!
```

---

## 📊 Logs em Cada Camada

### Backend (Django Terminal)

```bash
# Iniciação de pagamento
💳 Initiating payment: {method: 'mpesa', amount: 468.00}
🔔 Using configured WEBHOOK_BASE_URL: https://abc.ngrok-free.app
✅ Payment initiated: payment_id=143, order_id=142

# Webhook recebido
🔔 Webhook received from IP: 196.45.xxx.xxx
📦 Webhook payload: {'event': 'payment.success', 'reference': 'PAY000143'}
🔔 Webhook received: event=payment.success, payment_id=143, status: pending → paid
📦 Order ORD-000142 (id=142) status updated: pending → paid

# Polling do frontend
📊 Payment Status Poll: order_id=142, order.status=paid
✅ Returning status: order.status=paid, payments=[{id: 143, status: 'paid'}]
```

### Frontend (Browser Console)

```javascript
// Iniciação
🔐 Using Firebase token for payment request
💳 Initiating payment: {method: 'mpesa', url: '...', headers: [...]}
✅ Payment initiated: {order_id: 142, checkout_url: 'https://paysuite...'}

// Polling
📊 Poll Response: {
  order_id: 142,
  order_status: 'paid',
  payments: [{id: 143, status: 'paid'}],
  timestamp: '23:15:30'
}

// UI atualizada
✅ Order status changed: pending → paid
✅ Cart cleared successfully
```

### ngrok Dashboard (http://localhost:4040)

```
POST /api/cart/payments/webhook/
Status: 200 OK
Duration: 234ms
Request:
  Headers: Content-Type: application/json
  Body: {"event": "payment.success", "reference": "PAY000143", ...}
Response:
  Status: 200
  Body: {"status": "success"}
```

---

## 🎯 Checklist de Funcionamento

### ✅ Sistema Funcionando Corretamente:

```
✅ Backend roda sem erros
✅ Frontend carrega sem erros
✅ Webhook URL configurada corretamente
✅ Log: "🔔 Using configured WEBHOOK_BASE_URL: ..."
✅ Pagamento cria Order + Payment com status='pending'
✅ Paysuite redireciona para página de pagamento
✅ Webhook chega após pagamento
✅ Log: "🔔 Webhook received: event=payment.success"
✅ Status atualiza no banco: pending → paid
✅ Log: "📦 Order status updated: pending → paid"
✅ Polling detecta mudança
✅ Log frontend: "📊 Poll Response: {order_status: 'paid'}"
✅ UI atualiza com mensagem verde de sucesso
✅ Cart limpo automaticamente
✅ Pedido aparece em /account/orders
```

---

## 🛠️ Configuração Rápida

### Desenvolvimento (com ngrok):

```powershell
# 1. Instalar ngrok
winget install ngrok.ngrok

# 2. Executar script automatizado
.\scripts\start-dev-with-ngrok.ps1

# 3. Iniciar frontend (outro terminal)
cd frontend
npm run dev

# 4. Testar compra
```

### Produção (Railway/Render):

```bash
# 1. Configurar variável de ambiente
WEBHOOK_BASE_URL=https://seu-app.railway.app

# 2. Deploy
railway up
# ou
git push (Render deploy automático)

# 3. Testar compra real
```

---

## 📚 Documentação Relacionada

- **Guia Completo:** [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)
- **Setup ngrok:** [NGROK_DEVELOPMENT_SETUP.md](NGROK_DEVELOPMENT_SETUP.md)
- **FAQ:** [FAQ.md](FAQ.md)
- **Índice:** [INDICE.md](INDICE.md)

---

**Sistema pronto para processar pagamentos reais! 🚀💳✨**

