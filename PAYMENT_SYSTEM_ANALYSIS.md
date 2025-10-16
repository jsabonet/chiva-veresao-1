# Análise Completa: Sistema de Rastreamento de Pagamentos

## Problema Reportado

> "OrderConfirmation.tsx não está refletindo o estado do pedido. O pagamento é feito em link externo e é necessário que a loja rastreie exatamente o estado do pedido."

## Estrutura do Sistema Identificada

### 1. Fluxo de Pagamento Atual

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Usuário    │────→│   Frontend   │────→│   Backend      │
│  Checkout   │     │  initiate    │     │  initiate_     │
│             │     │  Payment     │     │  payment       │
└─────────────┘     └──────────────┘     └────────────────┘
                            │                     │
                            │                     ↓
                            │            ┌────────────────┐
                            │            │   Paysuite     │
                            │            │   Gateway      │
                            │            └────────────────┘
                            │                     │
                            │                     │ Webhook
                            │                     ↓
                    ┌───────────────┐    ┌────────────────┐
                    │ OrderConfirm  │←───│   Backend      │
                    │ .tsx          │    │   webhook      │
                    │ (Polling)     │    │   handler      │
                    └───────────────┘    └────────────────┘
                            ↑                     │
                            │                     ↓
                            │            ┌────────────────┐
                            └────────────│  Database      │
                              GET /status│  Order/Payment │
                                         └────────────────┘
```

### 2. Componentes do Sistema

#### Backend (`backend/cart/views.py`)

**A. `initiate_payment` (POST /api/cart/payments/initiate/)**
- Cria Payment record (status='pending')
- Cria Order provisório (status='pending')
- Chama Paysuite Gateway
- Retorna order_id + checkout_url para frontend

**B. `paysuite_webhook` (POST /api/cart/payments/webhook/)**
- Recebe notificação do Paysuite
- Atualiza Payment.status ('paid' ou 'failed')
- Atualiza Order.status via OrderManager
- Limpa Cart quando status='paid'
- ⚠️ **CRÍTICO**: É aqui que o status muda de 'pending' → 'paid'

**C. `payment_status` (GET /api/cart/payments/status/{order_id}/)**
- Endpoint usado pelo polling do frontend
- Retorna Order + Payments serializados
- Requer autenticação (IsAuthenticated)
- ⚠️ **CRÍTICO**: Este endpoint que OrderConfirmation consulta

#### Frontend (`frontend/src/pages/OrderConfirmation.tsx`)

**A. Polling Automático**
```typescript
// Consulta status a cada 3 segundos
pollingRef.current = window.setInterval(async () => {
  await poll();  // Chama fetchPaymentStatus(orderId)
}, 3000);
```

**B. Atualização de UI**
```typescript
const poll = async () => {
  const res = await fetchPaymentStatus(orderId);
  setStatus(res.order.status);  // ← Deve atualizar quando webhook muda
  setPayments(res.payments || []);
};
```

**C. Limpeza de Cart**
```typescript
useEffect(() => {
  if (status === 'paid' && !clearedRef.current) {
    clearCart();  // Só limpa quando status='paid'
    clearedRef.current = true;
  }
}, [status, clearCart]);
```

## Análise do Problema

### Possíveis Causas Identificadas

#### 1. ✅ Webhook Não Está Chegando
- Paysuite não consegue alcançar o endpoint (localhost não funciona em produção)
- URL do webhook incorreta no código
- Webhook bloqueado por firewall/proxy

#### 2. ✅ Webhook Chega Mas Falha
- Erro na atualização do Order no banco
- Transaction rollback
- Erro no OrderManager.update_order_status
- Payment não é encontrado (paysuite_reference incorreto)

#### 3. ✅ Polling Não Está Funcionando
- Erro 401: Usuário não autenticado
- Token Firebase expirado
- Endpoint retorna erro 404/500
- Polling para antes de receber atualização

#### 4. ✅ Status Atualiza Mas UI Não Reflete
- Estado React não atualiza
- Polling parou após 2 minutos
- Console errors não visíveis
- Cache do browser

## Melhorias Implementadas

### 1. Logs Detalhados no Backend

**Webhook Handler:**
```python
logger.info(f"🔔 Webhook received: event={event_name}, payment_id={payment.id}, status: {old_payment_status} → {payment.status}")
logger.info(f"📦 Order {order.order_number} (id={order.id}) status updated: {old_order_status} → {order.status}")
```

**Payment Status Endpoint:**
```python
logger.info(f"📊 Payment Status Poll: order_id={order_id}, order.status={order.status}")
logger.info(f"✅ Returning status: order.status={response_data['order']['status']}")
```

### 2. Logs Detalhados no Frontend

**Polling Function:**
```typescript
console.log('📊 Poll Response:', {
  order_id: res.order.id,
  order_status: res.order.status,
  payments: res.payments.map(p => ({ id: p.id, status: p.status })),
  timestamp: new Date().toLocaleTimeString()
});
```

### 3. Mensagens Visuais Melhoradas

**Estado 'paid':**
- ✅ Cor verde, ícone checkmark grande
- Mensagem clara: "Pagamento Aprovado!"
- Lista de próximos passos
- Botões: "Ver pedido" | "Continuar comprando"

**Estado 'failed':**
- ❌ Cor vermelha, ícone X grande
- Mensagem: "Pagamento Recusado"
- Instruções de retry
- Cart preservado
- Botões: "Voltar ao carrinho" | "Voltar à loja"

**Estado 'pending':**
- ⏳ Cor azul, ícone relógio animado
- Indicador de atualização automática
- Instrução para aguardar

## Como Testar (Guia Criado)

Criei `WEBHOOK_POLLING_TEST_GUIDE.md` com:

1. **Simulação de Webhook Manual**: PowerShell script para testar
2. **Verificação de Logs**: O que procurar em cada camada
3. **Checklist de Diagnóstico**: 14 pontos de verificação
4. **Comandos Úteis**: Django shell para inspecionar banco
5. **Cenários de Teste**: Sucesso, falha, timeout

## Próximas Ações Recomendadas

### 1. Teste Manual Imediato (15 min)

```powershell
# 1. Rodar backend
cd D:\Projectos\versao_1_chiva\backend
python manage.py runserver 8000

# 2. Rodar frontend (novo terminal)
cd D:\Projectos\versao_1_chiva\frontend
npm run dev

# 3. Simular webhook (novo terminal)
# Usar script do WEBHOOK_POLLING_TEST_GUIDE.md

# 4. Observar logs em todos terminais + console browser
```

### 2. Se Webhook Manual Funcionar

✅ **Sistema está OK** → O problema é:
- Paysuite não consegue alcançar seu servidor
- URL do webhook está incorreta na configuração

**Solução:**
- Em desenvolvimento: Use ngrok ou similar
- Em produção: Verifique DNS/firewall

### 3. Se Webhook Manual NÃO Funcionar

❌ **Bug no código** → Precisa debug:
- Ver logs do backend para identificar erro exato
- Pode ser erro no OrderManager
- Pode ser problema de transaction/rollback

### 4. Se Polling Retorna Erro 401

🔐 **Problema de Autenticação** → Soluções:

**Opção A (Temporária):** Remover autenticação para teste
```python
@permission_classes([AllowAny])
def payment_status(request, order_id: int):
    order = get_object_or_404(Order, id=order_id)  # Sem user check
```

**Opção B (Permanente):** Verificar token Firebase
- Inspecionar headers enviados no polling
- Ver se middleware de auth está funcionando
- Testar com Postman/Insomnia

## Arquivos Modificados

1. ✅ `backend/cart/views.py` - Logs em webhook e payment_status
2. ✅ `frontend/src/pages/OrderConfirmation.tsx` - Logs e UI melhorada
3. ✅ `WEBHOOK_POLLING_TEST_GUIDE.md` - Guia completo de teste
4. ✅ `PAYMENT_CONFIRMATION_FLOW.md` - Documentação do fluxo
5. ✅ Este arquivo - Análise completa

## Conclusão

O sistema **teoricamente está correto**:
- ✅ Webhook atualiza Order.status
- ✅ Serializer inclui campo status
- ✅ Endpoint payment_status retorna Order serializado
- ✅ Polling consulta endpoint a cada 3s
- ✅ UI atualiza quando status muda

**Mas na prática não funciona** → Precisa teste manual com logs para identificar onde quebra.

**Próximo passo crítico:** Execute o teste manual do `WEBHOOK_POLLING_TEST_GUIDE.md` e compartilhe os logs. Com isso, identificaremos exatamente qual elo da cadeia está falhando.

---

## Suporte Adicional

Se após teste manual ainda houver problema:

1. **Compartilhe logs completos** (backend terminal + browser console)
2. **Screenshot da UI** do OrderConfirmation
3. **Resultado do comando Django shell** mostrando Order.status
4. **Teste do endpoint direto** via Postman/curl

Com essas informações, poderei identificar e corrigir o problema específico.
