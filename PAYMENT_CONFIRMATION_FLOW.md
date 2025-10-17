# Fluxo de Confirmação de Pagamento

## Resumo
Sistema completo de aprovação/rejeição de pagamentos integrado com Paysuite, incluindo polling automático, mensagens contextuais e gerenciamento inteligente do carrinho.

## Como Funciona

### 1. Detecção de Aprovação/Rejeição

O sistema detecta o status do pagamento através de **polling automático**:

- **Endpoint**: `GET /api/cart/payments/status/{order_id}/`
- **Frequência**: A cada 3 segundos
- **Duração**: Até 2 minutos ou até alcançar estado final
- **Estados finais**: `paid`, `failed`, `cancelled`

```typescript
// OrderConfirmation.tsx - Polling Logic
const poll = async () => {
  const res = await fetchPaymentStatus(orderId);
  setStatus(res.order.status); // 'paid', 'failed', 'cancelled', 'pending'
  setPayments(res.payments || []);
};
```

### 2. Estados do Pagamento

#### ✅ `paid` - Pagamento Aprovado
- **Quando ocorre**: Webhook da Paysuite confirma pagamento bem-sucedido
- **Backend**: Atualiza `order.status = 'paid'` e `payment.status = 'paid'`
- **Frontend**: Polling detecta status e atualiza UI
- **Ação no carrinho**: **Limpo automaticamente** (uma única vez)

```typescript
// Cart é limpo somente quando status='paid'
useEffect(() => {
  if (status === 'paid' && !clearedRef.current) {
    clearCart();
    clearedRef.current = true;
  }
}, [status, clearCart]);
```

#### ❌ `failed` - Pagamento Recusado
- **Quando ocorre**: Paysuite rejeita pagamento (saldo insuficiente, erro do provedor, etc.)
- **Backend**: Atualiza `payment.status = 'failed'`
- **Frontend**: Polling detecta e mostra mensagem de erro
- **Ação no carrinho**: **Mantido intacto** para retry

#### ⚠️ `cancelled` - Pagamento Cancelado
- **Quando ocorre**: Usuário cancela no checkout externo ou timeout
- **Backend**: Atualiza `payment.status = 'cancelled'`
- **Frontend**: Polling detecta e informa o cancelamento
- **Ação no carrinho**: **Mantido intacto** para retry

#### ⏳ `pending` / `processing` - Aguardando
- **Quando ocorre**: Pagamento iniciado mas ainda sem confirmação
- **Frontend**: Mostra loading spinner e continua polling
- **Ação no carrinho**: **Mantido** até confirmação

### 3. Mensagens ao Usuário

#### Quando Aprovado (`paid`)
```
✅ Pagamento Aprovado!
Seu pedido foi confirmado e está sendo processado. 
Você receberá um email com os detalhes e atualizações sobre o envio.

✓ Próximos Passos:
• Você receberá um email de confirmação com os detalhes do pedido
• Acompanhe o status do envio na sua área de pedidos
• O prazo de entrega será informado por email
• Em caso de dúvidas, entre em contato com nosso suporte

[Ver pedido] [Continuar comprando]
```

#### Quando Rejeitado (`failed` ou `cancelled`)
```
❌ Pagamento Recusado / ⚠️ Pagamento Cancelado
Não foi possível processar o pagamento. 
Seu carrinho foi mantido para você tentar novamente.

💡 O que fazer agora:
• Seu carrinho foi preservado e continua disponível
• Verifique se há saldo suficiente na sua carteira
• Tente outro método de pagamento (M-Pesa, e-Mola, Cartão)
• Se o problema persistir, contate seu provedor de pagamento

[Voltar ao carrinho] [Voltar à loja]
```

### 4. Feedback Visual

#### Cores e Ícones por Estado
- **Paid**: Verde, ícone ✅, borda verde
- **Failed**: Vermelho, ícone ❌, borda vermelha  
- **Cancelled**: Âmbar, ícone ⚠️, borda âmbar
- **Pending**: Azul, ícone ⏳ (animado), borda azul

```tsx
// Exemplo de configuração visual
case 'paid':
  return { 
    icon: <CheckCircle2 className="h-8 w-8 text-green-600" />,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-900'
  };
```

### 5. Fluxo Backend (Webhook)

```python
# backend/cart/views.py - paysuite_webhook
@api_view(['POST'])
@permission_classes([AllowAny])
def paysuite_webhook(request):
    data = request.data
    event_name = data.get('event')  # 'payment.success' ou 'payment.failed'
    
    payment = Payment.objects.filter(paysuite_reference=reference).first()
    
    if event_name == 'payment.success':
        payment.status = 'paid'
        # Criar/atualizar Order
        OrderManager.update_order_status(order, 'paid')
        # Limpar cart no backend
        cart.status = 'converted'
        cart.items.all().delete()
    
    elif event_name == 'payment.failed':
        payment.status = 'failed'
        # Cart permanece ativo para retry
    
    payment.save()
    return Response({'ok': True})
```

### 6. Garantias de Consistência

#### Cart Clearing (Limpeza do Carrinho)
- **Backend**: Limpa quando webhook recebe `payment.success`
- **Frontend**: Limpa quando polling detecta `status='paid'`
- **Guard**: `clearedRef` previne múltiplas limpezas
- **Retry seguro**: Se falhar, cart permanece disponível

#### Polling Inteligente
- Para automaticamente em estados finais
- Timeout de 2 minutos para evitar polling infinito
- Cancela ao desmontar componente (cleanup)

```typescript
useEffect(() => {
  if (isFinal && pollingRef.current) {
    window.clearInterval(pollingRef.current);
    pollingRef.current = null;
  }
}, [isFinal]);
```

## Fluxo Completo End-to-End

```
1. Usuário finaliza checkout
   └─> POST /api/cart/payments/initiate/
       └─> Backend cria Payment (status='pending')
       └─> Backend cria Order (status='pending')
       └─> Backend chama Paysuite
       └─> Retorna order_id + checkout_url

2. Frontend navega para /pedido/confirmacao/{order_id}
   └─> OrderConfirmation monta
   └─> Inicia polling a cada 3s
   └─> Mostra "⏳ Aguardando confirmação"

3. Usuário completa pagamento no Paysuite
   └─> Paysuite envia webhook para /api/cart/payments/webhook/
       └─> Backend atualiza Payment.status = 'paid'
       └─> Backend atualiza Order.status = 'paid'
       └─> Backend limpa Cart (items.delete(), status='converted')

4. Frontend detecta mudança via polling
   └─> setStatus('paid')
   └─> Atualiza UI: "✅ Pagamento Aprovado!"
   └─> Limpa cart local (clearCart())
   └─> Mostra botões: [Ver pedido] [Continuar comprando]

5A. Se pagamento falhar:
   └─> Paysuite webhook: event='payment.failed'
   └─> Backend: Payment.status = 'failed'
   └─> Backend: Cart permanece ativo
   └─> Frontend polling detecta 'failed'
   └─> UI: "❌ Pagamento Recusado" + instruções retry
   └─> Cart local preservado
   └─> Botões: [Voltar ao carrinho] [Voltar à loja]

5B. Se usuário cancelar:
   └─> Similar a 5A mas status='cancelled'
```

## Testes Recomendados

### Cenário 1: Pagamento Bem-Sucedido
1. Adicionar produto ao carrinho
2. Selecionar método de pagamento (e-Mola ou M-Pesa)
3. Finalizar checkout
4. Completar pagamento no Paysuite
5. ✅ Verificar: Mensagem verde de sucesso aparece
6. ✅ Verificar: Cart local foi limpo (badge mostra 0)
7. ✅ Verificar: Botão "Ver pedido" funciona
8. ✅ Verificar: Backend marcou order e payment como 'paid'

### Cenário 2: Pagamento Recusado
1. Adicionar produto ao carrinho
2. Iniciar checkout
3. Simular falha (saldo insuficiente ou cancelar)
4. ❌ Verificar: Mensagem vermelha de erro aparece
5. ✅ Verificar: Cart local ainda tem os produtos
6. ✅ Verificar: Botão "Voltar ao carrinho" leva ao cart preenchido
7. ✅ Verificar: Backend mantém cart ativo
8. ✅ Verificar: Usuário pode tentar novamente sem re-adicionar produtos

### Cenário 3: Timeout/Cancelamento
1. Adicionar produto ao carrinho
2. Iniciar checkout
3. Fechar página de pagamento externo sem completar
4. Aguardar timeout do Paysuite
5. ⚠️ Verificar: Mensagem âmbar de cancelamento
6. ✅ Verificar: Cart preservado
7. ✅ Verificar: Usuário pode tentar novamente

## Resolução de Problemas

### Cart não limpa após pagamento aprovado
- **Causa**: Status não mudou para 'paid' ou erro no clearCart()
- **Solução**: Verificar webhook chegando corretamente, checar logs do backend

### Polling não para
- **Causa**: isFinal não detectado ou pollingRef não limpo
- **Solução**: Verificar que status final está correto, forçar cleanup

### Mensagem de erro genérica
- **Causa**: fetchPaymentStatus falhou
- **Solução**: Verificar endpoint /api/cart/payments/status/{id}/ retorna corretamente

### Cart limpo mesmo com falha
- **Causa**: Bug no useEffect ou status errado
- **Solução**: Garantir que clearCart só roda com `status === 'paid'`

## Arquivos Modificados

- `frontend/src/pages/OrderConfirmation.tsx` - UI de confirmação com polling
- `frontend/src/pages/Checkout.tsx` - Não limpa cart no initiate (corrigido)
- `frontend/src/hooks/usePayments.ts` - Hook de pagamentos com validação
- `backend/cart/views.py` - Endpoint initiate + webhook handler
- `backend/cart/models.py` - Models Order, Payment, Cart

## Próximos Passos (Opcional)

- [ ] Adicionar notificação push quando pagamento confirmar
- [ ] Email automático ao confirmar pagamento
- [ ] SMS de confirmação
- [ ] Dashboard admin para monitorar pagamentos em tempo real
- [ ] Retry automático em caso de falha temporária
- [ ] Métricas: taxa de conversão, motivos de falha, tempo médio de confirmação
