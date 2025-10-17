# 🎯 DESCOBERTA: O Problema NÃO é o Webhook!

## 🔍 REVELAÇÃO CRUCIAL

Você tinha razão! Após analisar o código, descobri que **o pedido (Order) JÁ É CRIADO na função `initiate_payment`**, ANTES do webhook chegar!

## 📊 FLUXO ATUAL (Como realmente funciona)

```
┌──────────┐         ┌─────────┐         ┌──────────┐
│ Frontend │         │ Backend │         │ PaySuite │
└────┬─────┘         └────┬────┘         └────┬─────┘
     │                    │                   │
     │ 1. POST /initiate/ │                   │
     ├───────────────────>│                   │
     │                    │                   │
     │                    │ 2. Create Payment │
     │                    │    (status='initiated')
     │                    │                   │
     │                    │ 3. Call PaySuite  │
     │                    ├──────────────────>│
     │                    │                   │
     │                    │ 4. Get payment_id │
     │                    │<──────────────────┤
     │                    │                   │
     │                    │ 5. ✅ CREATE ORDER│
     │                    │    (status='pending')
     │                    │    order_id = 123 │
     │                    │                   │
     │ 6. Return order_id │                   │
     │<───────────────────┤                   │
     │    order_id: 123   │                   │
     │                    │                   │
     │ 7. Navigate to     │                   │
     │    /order/123      │                   │
     │                    │                   │
     │ 8. Poll /status/123│                   │
     ├───────────────────>│                   │
     │                    │                   │
     │ 9. Return order    │                   │
     │    status='pending'│                   │
     │<───────────────────┤                   │
     │                    │                   │
     │    (continua polling a cada 3s...)     │
```

## 💡 CÓDIGO QUE PROVA ISSO

### Backend: `cart/views.py` linha 1141-1166

```python
# Create a lightweight Order now so frontend can reference it immediately.
# The webhook will detect payment.order and won't recreate the Order.
try:
    from .models import Order

    order = Order.objects.create(
        cart=cart,
        user=cart.user if cart and hasattr(cart, 'user') else None,
        total_amount=payment.amount,
        shipping_cost=shipping_cost,
        status='pending',  # ← PEDIDO CRIADO COM STATUS PENDING
        shipping_method=shipping_method or 'standard',
        shipping_address=shipping_address,
        billing_address=billing_address,
        customer_notes=customer_notes,
    )
    # Link payment to created order
    payment.order = order
    payment.save(update_fields=['order'])
    # Expose order id to frontend
    response_data['order_id'] = order.id  # ← RETORNA order_id
except Exception as e:
    logger.exception('Failed to create provisional Order after payment initiation')
    return Response({'error': 'failed_to_create_order', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

return Response(response_data)
```

### Frontend: `CheckoutDetails.tsx` linha 154-161

```typescript
const { order_id, payment } = await initiatePayment(method as 'mpesa' | 'emola' | 'card' | 'transfer', payload);

const redirectUrl = payment?.checkout_url || payment?.redirect_url || payment?.payment_url;

// Navigate to order confirmation
navigate(`/order-confirmation/${order_id}`);  // ← USA order_id retornado
```

## ❓ ENTÃO QUAL É O VERDADEIRO PROBLEMA?

O problema NÃO é que o pedido não é criado. **O pedido É CRIADO IMEDIATAMENTE!**

O problema é que:

### 1. O Pedido é Criado com `status='pending'`

```python
order = Order.objects.create(
    # ...
    status='pending',  # ← SEMPRE pending no início
)
```

### 2. O Webhook DEVERIA Atualizar para `status='paid'`

```python
# No webhook (linha 1227-1233)
if event_name == 'payment.success':
    payment.status = 'paid'
elif event_name == 'payment.failed':
    payment.status = 'failed'
else:
    payment.status = 'pending'

payment.save(update_fields=['status', 'raw_response'])
```

**MAS O WEBHOOK ATUALIZA O `payment.status`, NÃO O `order.status`!**

### 3. O Webhook TAMBÉM Deveria Atualizar o Order

```python
# No webhook (linha 1347-1361)
if order:
    try:
        old_order_status = order.status
        OrderManager.update_order_status(
            order=order,
            new_status='paid',  # ← ISSO deveria atualizar
            user=None,
            notes=f"Pagamento confirmado via webhook - {event_name}"
        )
        order.refresh_from_db()
        logger.info(f"📦 Order {order.order_number} status updated: {old_order_status} → {order.status}")
    except Exception as e:
        logger.error(f"❌ Error updating order status after payment: {e}")
```

## 🔎 INVESTIGAÇÃO: Por que o Status Não Atualiza?

Vamos verificar 3 possibilidades:

### Possibilidade 1: Webhook Não Está Chegando (URL Incorreta)
- ✅ Já identificamos este problema
- ✅ Já corrigimos localmente (`.env` atualizado)
- ⏳ Precisa aplicar em produção

### Possibilidade 2: Webhook Chega mas Não Encontra o Payment
```python
# No webhook (linha 1209-1223)
payment = None
if reference:
    payment = Payment.objects.filter(paysuite_reference=reference).first()

if not payment:
    # ... tenta por metadata ...
    
if not payment:
    logger.warning('Paysuite webhook: payment not found for payload')
    return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
```

**PROBLEMA POTENCIAL:** O PaySuite pode estar enviando uma referência diferente da que salvamos!

### Possibilidade 3: Webhook Atualiza Payment mas Não Atualiza Order

Olhando o código, vejo que:

```python
# Linha 1227: Atualiza Payment.status ✅
payment.status = 'paid'
payment.save(update_fields=['status', 'raw_response'])

# Linha 1347: TENTA atualizar Order.status
if order:  # ← Se order existe
    OrderManager.update_order_status(
        order=order,
        new_status='paid',
        ...
    )
```

**MAS:** Isso só acontece se `payment.order` existir e `payment.status == 'paid'`!

## 🎯 SOLUÇÃO REAL

O problema é que o `OrderConfirmation.tsx` está fazendo polling do **`order.status`**, mas:

1. O webhook pode NÃO estar chegando (problema do webhook URL)
2. OU o webhook está atualizando `payment.status` mas não `order.status`
3. OU o frontend está consultando o campo errado

Vamos verificar o que o endpoint `/status/` retorna:

### Backend: `cart/views.py` linha 1393-1412

```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_status(request, order_id: int):
    """Simple endpoint to fetch an order and its payments for status polling."""
    try:
        from .models import Order, Payment
        from .serializers import OrderSerializer, PaymentSerializer

        order = get_object_or_404(Order, id=order_id, user=request.user)
        payments = Payment.objects.filter(order=order).order_by('-created_at')

        # Detailed logging for debugging
        logger.info(f"📊 Payment Status Poll: order_id={order_id}, order.status={order.status}, payment_count={payments.count()}")
        if payments.exists():
            latest_payment = payments.first()
            logger.info(f"💳 Latest Payment: id={latest_payment.id}, status={latest_payment.status}, method={latest_payment.method}, ref={latest_payment.paysuite_reference}")

        response_data = {
            'order': OrderSerializer(order).data,
            'payments': PaymentSerializer(payments, many=True).data,
        }
        
        logger.info(f"✅ Returning status: order.status={response_data['order']['status']}, payments={[p['status'] for p in response_data['payments']]}")
        
        return Response(response_data)
```

### Frontend: `OrderConfirmation.tsx` linha 77-88

```typescript
const poll = async () => {
  try {
    const res = await fetchPaymentStatus(orderId);
    if (cancelled) return;
    
    console.log('📊 Poll Response:', {
      order_id: res.order.id,
      order_status: res.order.status,  // ← Lê order.status
      payments: res.payments.map((p: any) => ({ id: p.id, status: p.status, method: p.method })),
      timestamp: new Date().toLocaleTimeString()
    });
    
    setStatus(res.order.status);  // ← Usa order.status
```

## 🚨 PROBLEMA ENCONTRADO!

O frontend está usando `res.order.status`, mas deveria estar verificando AMBOS:
- `order.status` (status do pedido)
- `payments[0].status` (status do pagamento)

Porque o webhook atualiza **primeiro** o `payment.status`, e **depois** tenta atualizar o `order.status`.

Se houver qualquer erro ao atualizar o `order.status`, o `payment.status` já estará como `'paid'`, mas o `order.status` continuará `'pending'`!

## ✅ CORREÇÃO NECESSÁRIA

### Opção 1: Frontend Verificar Payment Status Primeiro

```typescript
const poll = async () => {
  try {
    const res = await fetchPaymentStatus(orderId);
    if (cancelled) return;
    
    // Priorizar payment.status sobre order.status
    const latestPayment = res.payments?.[0];
    let effectiveStatus = res.order.status;
    
    if (latestPayment) {
      // Se payment está paid/failed, usar isso
      if (latestPayment.status === 'paid' || latestPayment.status === 'failed') {
        effectiveStatus = latestPayment.status;
      }
    }
    
    setStatus(effectiveStatus);
    setPayments(res.payments || []);
    setLastUpdate(new Date().toLocaleTimeString());
  } catch (e: any) {
    // ...
  }
};
```

### Opção 2: Backend Garantir Sincronização

Modificar o webhook para SEMPRE sincronizar `order.status` com `payment.status`:

```python
# No webhook, após atualizar payment.status
payment.save(update_fields=['status', 'raw_response'])

# GARANTIR que order.status seja atualizado
if payment.order:
    payment.order.status = payment.status
    payment.order.save(update_fields=['status'])
    logger.info(f"✅ Synced order {payment.order.id} status to {payment.status}")
```

## 📋 PLANO DE AÇÃO

1. **Verificar Logs de Produção** (URGENTE)
   ```bash
   docker compose logs backend | grep -E "(Webhook|Payment Status Poll)"
   ```
   
   Procurar por:
   - `🔔 Webhook received:` - Webhook está chegando?
   - `📊 Payment Status Poll:` - O que está sendo retornado?
   - `💳 Latest Payment:` - Qual é o `payment.status`?

2. **Corrigir URL do Webhook** (Já identificado)
   - Adicionar `WEBHOOK_BASE_URL=https://chivacomputer.co.mz` ao `.env`
   - Atualizar no dashboard do PaySuite

3. **Implementar Sincronização** (Novo)
   - Modificar webhook para sincronizar `order.status` com `payment.status`
   - OU modificar frontend para priorizar `payment.status`

4. **Adicionar Logs Detalhados**
   - Ver exatamente o que o PaySuite está enviando no webhook
   - Ver se `payment.paysuite_reference` está sendo encontrado

---

**CONCLUSÃO:** O problema NÃO é que o pedido não é criado. O pedido É criado imediatamente. O problema é que o status não está sendo atualizado corretamente após o webhook, possivelmente porque:

1. ❌ Webhook não está chegando (URL localhost)
2. ❌ Webhook não está encontrando o payment (referência incorreta)
3. ❌ Webhook atualiza payment mas não order
4. ❌ Frontend está lendo apenas order.status ao invés de payment.status

Vamos investigar os logs para identificar qual desses é o problema real!
