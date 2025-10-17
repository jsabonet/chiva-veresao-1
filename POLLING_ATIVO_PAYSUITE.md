# Polling Ativo PaySuite - Solução para Webhooks Não Entregues

## 🎯 Problema Resolvido

Quando webhooks do PaySuite não chegam ao servidor (por restrições de rede, firewall, etc.), os pagamentos ficam indefinidamente com status "pending", mesmo que o cliente tenha pago com sucesso no checkout externo.

## ✅ Solução Implementada

### **Polling Ativo da API PaySuite**

O backend agora consulta **ativamente** a API do PaySuite quando:
1. O frontend faz polling do endpoint `/api/cart/payments/status/{order_id}/`
2. O pagamento ainda está com status `pending`
3. Existe uma referência PaySuite (`paysuite_reference`)

---

## 🔧 Como Funciona

### 1. Frontend (OrderConfirmation.tsx)
**NÃO MUDOU** - continua fazendo o que já fazia:

```typescript
// A cada 3 segundos, consulta o backend
const res = await fetchPaymentStatus(orderId);
// GET /api/cart/payments/status/12/
```

### 2. Backend (views.py → payment_status)
**AGORA FAZ POLLING ATIVO**:

```python
@api_view(['GET'])
def payment_status(request, order_id: int):
    # 1. Busca pedido e pagamento no banco de dados
    order = get_object_or_404(Order, id=order_id, user=request.user)
    payments = Payment.objects.filter(order=order).order_by('-created_at')
    latest_payment = payments.first()
    
    # 2. SE pagamento está pending E tem referência PaySuite
    if latest_payment.status == 'pending' and latest_payment.paysuite_reference:
        
        # 3. Consulta API PaySuite diretamente
        client = PaysuiteClient()
        paysuite_response = client.get_payment_status(latest_payment.paysuite_reference)
        
        # 4. Se PaySuite retornou status diferente (paid, failed, etc)
        if paysuite_response['data']['status'] in ['paid', 'completed']:
            # Atualiza Payment no banco
            latest_payment.status = 'paid'
            latest_payment.save()
            
            # Sincroniza Order
            order.status = 'paid'
            order.save()
            
            # Processa pedido (reduz estoque, limpa carrinho, etc)
            OrderManager.update_order_status(order, 'paid', notes="Confirmado via polling")
    
    # 5. Retorna status atualizado ao frontend
    return Response({
        'order': OrderSerializer(order).data,
        'payments': PaymentSerializer(payments).data
    })
```

### 3. PaySuite Client (paysuite.py)
**NOVO MÉTODO**:

```python
def get_payment_status(self, payment_id: str) -> dict:
    """Consulta status diretamente na API PaySuite"""
    url = f"{self.base_url}/v1/payments/{payment_id}"
    resp = self.session.get(url, timeout=10)
    return resp.json()
    # Retorna: { status: 'success', data: { id, status: 'paid', ... } }
```

---

## 📊 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (OrderConfirmation.tsx)                            │
│                                                              │
│  1. Polling a cada 3s:                                      │
│     GET /api/cart/payments/status/12/                       │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (views.py → payment_status)                         │
│                                                              │
│  2. Consulta banco de dados                                 │
│     Payment #12: status = 'pending'                         │
│                                                              │
│  3. Detecta pending → POLLING ATIVO                         │
│     GET https://paysuite.tech/api/v1/payments/4473cd66...   │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ PAYSUITE API                                                 │
│                                                              │
│  4. Responde com status real                                │
│     { status: 'success', data: { status: 'paid' } }         │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (atualização imediata)                              │
│                                                              │
│  5. Atualiza Payment.status = 'paid'                        │
│  6. Sincroniza Order.status = 'paid'                        │
│  7. Reduz estoque via OrderManager                          │
│  8. Limpa carrinho                                          │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (recebe resposta)                                  │
│                                                              │
│  9. Exibe "✅ Pagamento Aprovado!"                          │
│ 10. Para o polling (estado final)                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎁 Vantagens

### ✅ Zero Mudanças no Frontend
- `OrderConfirmation.tsx` continua fazendo polling do mesmo endpoint
- Nenhuma alteração de código necessária no React

### ✅ Funciona Sem Webhooks
- Não depende de webhooks chegarem ao servidor
- Consulta ativa a cada polling (máximo 3s de atraso)

### ✅ Compatível com Webhooks
- Se webhook chegar primeiro, atualiza imediatamente
- Se webhook não chegar, polling ativo atualiza em até 3s
- **Melhor dos dois mundos**: webhook rápido + fallback garantido

### ✅ Idempotente
- Pode consultar PaySuite múltiplas vezes sem problemas
- Só atualiza quando status realmente mudou
- Não cria duplicação ou inconsistências

---

## 🧪 Como Testar

### 1. Criar Novo Pedido
```bash
# No site, faça checkout normalmente
# Pedido ficará "pending"
```

### 2. Pagar no Checkout Externo
```bash
# Abra a checkout_url e pague
# (ou simule pagamento no sandbox PaySuite)
```

### 3. Voltar à Página de Confirmação
```bash
# OrderConfirmation.tsx começará polling automático
# Em até 3 segundos: status muda para "paid"
# ✅ Sem webhook! Apenas polling ativo!
```

### 4. Verificar Logs (Opcional)
```bash
docker-compose logs backend | grep -i "active polling"

# Saída esperada:
# 🔄 Active polling PaySuite for payment 4473cd66-...
# ✅ PaySuite returned status: paid for payment 12
# 🔄 Updating payment 12 from pending to paid based on PaySuite polling
# 📦 Order CHV202510170007 processed via active polling
```

---

## 📝 Mapeamento de Status PaySuite

| Status PaySuite | Status Interno | Descrição |
|-----------------|----------------|-----------|
| `paid` | `paid` | Pagamento aprovado |
| `completed` | `paid` | Pagamento completado |
| `success` | `paid` | Pagamento bem-sucedido |
| `failed` | `failed` | Pagamento recusado |
| `cancelled` | `cancelled` | Pagamento cancelado |
| `rejected` | `failed` | Pagamento rejeitado |
| `expired` | `failed` | Pagamento expirado |
| `pending` | `pending` | Aguardando (não muda) |

---

## 🔧 Configuração

### Variáveis de Ambiente Relevantes
```bash
# URL base da API PaySuite
PAYSUITE_BASE_URL=https://paysuite.tech/api

# Chave API (necessária para consultas)
PAYSUITE_API_KEY=sua_chave_aqui

# Timeout para consultas
PAYSUITE_TIMEOUT=10
```

### Endpoint do Polling
```
GET /api/cart/payments/status/{order_id}/
Authorization: Bearer <firebase_token>
```

---

## ⚡ Performance

- **Polling Ativo**: Apenas quando pagamento está `pending`
- **Cache Natural**: Se já está `paid` ou `failed`, não consulta PaySuite
- **Timeout**: 10 segundos (configurável)
- **Retries**: Não bloqueia; se falhar, tenta na próxima consulta (3s depois)

---

## 🆚 Comparação: Webhook vs Polling

| Aspecto | Webhook | Polling Ativo |
|---------|---------|---------------|
| **Latência** | ~1-2s (imediato) | ~3s (próximo poll) |
| **Confiabilidade** | ❌ Pode falhar (rede/firewall) | ✅ Sempre funciona |
| **Carga Servidor** | ⚡ Zero (push) | 🔄 Baixa (só quando pending) |
| **Dependência Externa** | ✅ PaySuite precisa entregar | ❌ Consultamos nós mesmos |
| **Complexidade** | 🔒 Assinatura, validação | 🔓 GET simples |

**Solução Atual**: Usa **AMBOS** - webhook se chegar (rápido) + polling ativo como fallback (garantido).

---

## 🎉 Conclusão

Agora o sistema **não depende de webhooks** para funcionar. Mesmo que PaySuite não consiga entregar webhooks (problema de rede, firewall, geo-restrição, etc.), o polling ativo garante que:

1. ✅ Pagamentos sejam detectados em até 3 segundos
2. ✅ Pedidos sejam processados automaticamente
3. ✅ Estoque seja reduzido corretamente
4. ✅ Clientes vejam confirmação imediata
5. ✅ Carrinhos sejam limpos após pagamento

**Zero código novo no frontend. Zero dependência de webhooks.**
