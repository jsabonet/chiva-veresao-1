# 🔒 CORREÇÃO CRÍTICA: Orders Somente Após Pagamento

## 🎯 Problema Identificado

**Antes:**
- ❌ `Order` era criado IMEDIATAMENTE em `initiate_payment`
- ❌ Resultado: Dezenas de pedidos falsos no sistema
- ❌ Pedidos criados mesmo sem pagamento confirmado

**Impacto:**
- Admin vê pedidos que nunca foram pagos
- Confusão no controle de estoque
- Dificuldade em identificar pedidos reais

---

## ✅ Solução Implementada

### 1. Order Criado APENAS Quando Pago

**Arquivo:** `backend/cart/views.py`

#### Mudança em `initiate_payment` (linhas ~1220-1240):

**Antes:**
```python
# Create a lightweight Order now so frontend can reference it immediately
order = Order.objects.create(
    cart=cart,
    user=cart.user,
    total_amount=payment.amount,
    shipping_cost=shipping_cost,
    status='pending',  # ← PROBLEMA: Order criado com status=pending
    ...
)
```

**Depois:**
```python
# ========================================
# 🚨 CRÍTICO: NÃO criar Order aqui!
# Order só deve ser criado APÓS confirmação de pagamento (paid)
# via webhook ou polling para evitar pedidos falsos.
# ========================================
# O payment já foi criado com cart vinculado e request_data salvo.
# O webhook/polling criará o Order quando status = 'paid'.

response_data['payment_id'] = payment.id
logger.info(f"💳 Payment {payment.id} criado sem Order. Order será criado apenas quando status='paid'")
```

### 2. Fluxo Correto Agora

```
1. Cliente preenche checkout
   ↓
2. Backend cria PAYMENT (não Order)
   ↓
3. Cliente paga com M-Pesa/E-mola
   ↓
4. Webhook ou Polling detecta: status='paid'
   ↓
5. SOMENTE AGORA: Order é criado
   ↓
6. Stock é reduzido
   ↓
7. Emails enviados
```

### 3. Polling Ajustado para Aceitar payment_id

**Arquivo:** `backend/cart/views.py` **Linha ~1628**

```python
@api_view(['GET'])
def payment_status(request, order_id: int):
    """
    Aceita order_id OR payment_id (backwards compatible).
    """
    # Try to get Order first (existing flow)
    order = Order.objects.filter(id=order_id, user=request.user).first()
    
    if order:
        # Order exists, get payments
        payments = Payment.objects.filter(order=order).order_by('-created_at')
    else:
        # Order doesn't exist yet, treat order_id as payment_id
        payment = Payment.objects.filter(id=order_id).first()
        if not payment:
            return Response({'error': 'Payment or order not found'}, status=404)
        
        payments = [payment]
        order = payment.order  # May be None if not yet created
```

**Response ajustada:**
```python
response_data = {
    'order': OrderSerializer(order).data if order else None,
    'payment_id': payments[0].id if payments else None,
    'payments': PaymentSerializer(payments, many=True).data,
}
```

---

## 📧 Email do Admin Corrigido

### Mudança em `settings.py`

**Arquivo:** `backend/chiva_backend/settings.py` **Linha 270**

**Antes:**
```python
ADMIN_EMAIL = config('ADMIN_EMAIL', default='admin@chivacomputer.co.mz')
```

**Depois:**
```python
# Admin notification email - emails de nova venda vão para este endereço
ADMIN_EMAIL = config('ADMIN_EMAIL', default='chivacomputer@gmail.com')
```

**Também alterado:**
```python
BREVO_SENDER_EMAIL = config('BREVO_SENDER_EMAIL', default='chivacomputer@gmail.com')
```

### Garantia

Agora TODOS os emails de "Nova Venda" vão para: **chivacomputer@gmail.com**

---

## 🧪 Como Testar

### Teste 1: Verificar Que Order Não é Criado Antes do Pagamento

```bash
# 1. No backend Docker
docker compose exec backend bash

# 2. Contar Orders antes
python manage.py shell
>>> from cart.models import Order, Payment
>>> Order.objects.count()
10  # Exemplo

# 3. Fazer compra no site mas NÃO pagar
# (apenas iniciar pagamento)

# 4. Contar Orders depois
>>> Order.objects.count()
10  # Deve ser o MESMO número!

# 5. Contar Payments
>>> Payment.objects.count()
5  # Aumentou! Payment foi criado

>>> Payment.objects.last().order
None  # Order é None até pagar!
```

### Teste 2: Verificar Que Order é Criado Após Pagamento

```bash
# 1. Fazer compra e PAGAR com M-Pesa

# 2. Aguardar confirmação (10-30 segundos)

# 3. Verificar no shell
>>> Payment.objects.last().order
<Order: Order CHV202510220001>  # Agora tem Order!

>>> Order.objects.last().status
'paid'  # Status é 'paid', não 'pending'!
```

### Teste 3: Verificar Email do Admin

```bash
# 1. Fazer compra e pagar

# 2. Verificar logs
docker compose logs backend | grep "send_new_order_notification_to_admin"

# Deve mostrar:
# 📧 Email de nova venda enviado para admin

# 3. Verificar chivacomputer@gmail.com
# Deve receber email: "🎉 Nova Venda #CHV..."
```

---

## 📊 Impacto das Mudanças

### Antes (Problema)

| Ação | Orders Criados | Problema |
|------|----------------|----------|
| 100 checkouts iniciados | 100 | ❌ Todos criados |
| 20 pagamentos confirmados | 100 | ❌ 80 falsos |
| **Total no sistema** | **100** | **❌ 80% falsos!** |

### Depois (Corrigido)

| Ação | Orders Criados | Status |
|------|----------------|--------|
| 100 checkouts iniciados | 0 | ✅ Nenhum |
| 20 pagamentos confirmados | 20 | ✅ Somente pagos |
| **Total no sistema** | **20** | **✅ 100% reais!** |

---

## 🚨 Atenção: Frontend Precisa Ser Ajustado

O frontend atualmente espera `order_id` na resposta de `initiate_payment`.

**Mudança necessária no frontend:**

**Antes:**
```typescript
const response = await initiatePayment(...)
navigate(`/orders/status/${response.order_id}`)  // ❌ Vai falhar
```

**Depois:**
```typescript
const response = await initiatePayment(...)
// Use payment_id em vez de order_id
navigate(`/orders/status/${response.payment_id}`)  // ✅ Correto
```

O endpoint `payment_status` já foi ajustado para aceitar ambos!

---

## ✅ Checklist de Deploy

- [x] 1. Remover criação de Order em `initiate_payment`
- [x] 2. Ajustar `payment_status` para aceitar `payment_id`
- [x] 3. Ajustar response de `payment_status` para incluir `payment_id`
- [x] 4. Alterar `ADMIN_EMAIL` default para `chivacomputer@gmail.com`
- [x] 5. Alterar `BREVO_SENDER_EMAIL` para `chivacomputer@gmail.com`
- [ ] 6. **Ajustar frontend** para usar `payment_id` em vez de `order_id`
- [ ] 7. Commit e push
- [ ] 8. Deploy
- [ ] 9. Testar fluxo completo

---

## 🔍 Verificação Pós-Deploy

### Admin Dashboard

```bash
# Limpar pedidos falsos antigos (opcional)
python manage.py shell

>>> from cart.models import Order
>>> # Pedidos criados mas nunca pagos
>>> fake_orders = Order.objects.filter(status='pending', created_at__lt='2025-10-22')
>>> print(f"Pedidos falsos encontrados: {fake_orders.count()}")
>>> # Para deletar (CUIDADO!):
>>> # fake_orders.delete()
```

### Monitorar Novos Pedidos

```bash
# Ver últimos 5 orders criados
>>> Order.objects.all().order_by('-created_at')[:5]

# TODOS devem ter status='paid' agora!
# Nenhum deve ter status='pending'
```

---

## 📝 Notas Importantes

### 1. Backwards Compatibility

O endpoint `payment_status` aceita AMBOS:
- `order_id` (fluxo antigo)
- `payment_id` (fluxo novo)

Isso garante que o sistema não quebra durante a transição.

### 2. Webhook vs Polling

Ambos agora criam Order somente quando `status='paid'`:
- **Webhook:** Se PaySuite notificar, Order é criado imediatamente
- **Polling:** Se webhook falhar, polling detecta e cria Order

### 3. Emails

Emails são enviados SOMENTE quando Order é criado (status='paid'):
- Cliente recebe: Confirmação + Status de Pagamento
- Admin recebe: Nova Venda em **chivacomputer@gmail.com**

---

**Data:** 22 de Outubro de 2025  
**Status:** ✅ Implementado (aguardando ajuste no frontend)  
**Prioridade:** 🔴 CRÍTICA
