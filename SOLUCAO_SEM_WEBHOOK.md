# 🎯 SOLUÇÃO DEFINITIVA: Atualização Manual de Status

## 🚨 PROBLEMA CONFIRMADO

**WEBHOOKS DO PAYSUITE NÃO ESTÃO CHEGANDO!**

Evidências:
- ✅ Payment 10 (falhou): `status=pending`, sem webhook
- ✅ Payment 11 (sucesso): `status=pending`, sem webhook  
- ✅ WEBHOOK_BASE_URL configurado
- ✅ Endpoint acessível
- ❌ **ZERO webhooks recebidos**

## 💡 POR QUE WEBHOOKS NÃO CHEGAM?

### Possibilidade 1: Dashboard PaySuite
Mesmo que você tenha "configurado", pode ser que:
- URL não foi salva corretamente
- Precisa ativar webhooks separadamente
- Está em modo sandbox (não envia webhooks reais)
- Webhook secret está incorreto

### Possibilidade 2: PaySuite Não Suporta Webhooks
Alguns gateways de pagamento não enviam webhooks automaticamente, você precisa:
- Consultar API deles periodicamente (polling)
- Ou atualizar status manualmente via dashboard

## ✅ SOLUÇÕES PRÁTICAS

### SOLUÇÃO 1: Endpoint de Atualização Manual (RÁPIDO - 5 min)

Criar endpoint para admin atualizar status manualmente:

```python
# backend/cart/views.py - Adicionar

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def manual_update_payment_status(request, payment_id):
    """
    Endpoint para admin atualizar status manualmente
    Útil quando webhooks não funcionam
    """
    from .models import Payment
    from django.shortcuts import get_object_or_404
    
    # Verificar se é admin
    if not request.user.is_staff:
        return Response({'error': 'Admin only'}, status=403)
    
    payment = get_object_or_404(Payment, id=payment_id)
    new_status = request.data.get('status')  # 'paid' or 'failed'
    
    if new_status not in ['paid', 'failed']:
        return Response({'error': 'Status must be paid or failed'}, status=400)
    
    old_status = payment.status
    payment.status = new_status
    payment.save(update_fields=['status'])
    
    # Sincronizar order
    if payment.order:
        payment.order.status = new_status
        payment.order.save(update_fields=['status'])
    
    logger.info(f"🔧 Manual update: Payment {payment_id}: {old_status} → {new_status}")
    
    return Response({
        'success': True,
        'payment_id': payment_id,
        'old_status': old_status,
        'new_status': new_status
    })
```

**Adicionar rota:**
```python
# backend/cart/urls.py
path('payments/<int:payment_id>/manual-update/', views.manual_update_payment_status, name='manual-update-payment'),
```

**Como usar:**
```bash
# Para payment 11 (que você pagou com sucesso)
curl -X POST https://chivacomputer.co.mz/api/cart/payments/11/manual-update/ \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"status": "paid"}'

# Para payment 10 (que falhou)
curl -X POST https://chivacomputer.co.mz/api/cart/payments/10/manual-update/ \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"status": "failed"}'
```

---

### SOLUÇÃO 2: Painel Admin no Django (MÉDIO - 10 min)

Adicionar ação no Django Admin para atualizar múltiplos payments:

```python
# backend/cart/admin.py

from django.contrib import admin
from .models import Payment

@admin.action(description='✅ Mark selected as PAID')
def mark_as_paid(modeladmin, request, queryset):
    for payment in queryset:
        old_status = payment.status
        payment.status = 'paid'
        payment.save()
        
        if payment.order:
            payment.order.status = 'paid'
            payment.order.save()
    
    count = queryset.count()
    modeladmin.message_user(request, f'{count} payments marked as paid')

@admin.action(description='❌ Mark selected as FAILED')
def mark_as_failed(modeladmin, request, queryset):
    for payment in queryset:
        old_status = payment.status
        payment.status = 'failed'
        payment.save()
        
        if payment.order:
            payment.order.status = 'failed'
            payment.order.save()
    
    count = queryset.count()
    modeladmin.message_user(request, f'{count} payments marked as failed')

class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'status', 'method', 'amount', 'created_at']
    list_filter = ['status', 'method', 'created_at']
    search_fields = ['paysuite_reference', 'order__order_number']
    actions = [mark_as_paid, mark_as_failed]
    
admin.site.register(Payment, PaymentAdmin)
```

**Como usar:**
1. Acessar: https://chivacomputer.co.mz/admin/cart/payment/
2. Selecionar payments pendentes
3. Escolher ação: "Mark selected as PAID" ou "Mark selected as FAILED"
4. Clicar "Go"

---

### SOLUÇÃO 3: Consultar PaySuite Dashboard Direto (ATUAL)

Já que webhooks não funcionam, você precisará:

1. **Ver status no PaySuite Dashboard:**
   - Acessar: https://paysuite.tech/dashboard/transactions
   - Ver se pagamento foi "Paid" ou "Failed"

2. **Atualizar manualmente no seu sistema:**
   - Via Django Admin (Solução 2)
   - Via API endpoint (Solução 1)
   - Via comando direto no banco:

```bash
# Atualizar payment 11 para paid (pagamento bem-sucedido)
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.get(id=11)
p.status = 'paid'
p.save()
if p.order:
    p.order.status = 'paid'
    p.order.save()
print(f'✅ Payment {p.id} updated to paid')
"

# Atualizar payment 10 para failed (pagamento falhou)
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.get(id=10)
p.status = 'failed'
p.save()
if p.order:
    p.order.status = 'failed'
    p.order.save()
print(f'❌ Payment {p.id} updated to failed')
"
```

---

## 🎯 RECOMENDAÇÃO IMEDIATA

### Passo 1: Atualizar Payments 10 e 11 Manualmente (AGORA)

```bash
# No servidor, execute:

# Payment 11 (você disse que foi bem-sucedido)
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.get(id=11)
p.status = 'paid'
p.save()
if p.order:
    p.order.status = 'paid'
    p.order.save()
print('✅ Payment 11 marked as PAID')
"

# Payment 10 (você disse que falhou)
docker compose exec backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.get(id=10)
p.status = 'failed'
p.save()
if p.order:
    p.order.status = 'failed'
    p.order.save()
print('❌ Payment 10 marked as FAILED')
"
```

### Passo 2: Verificar no Frontend

Após executar os comandos acima, abra o navegador e veja se o status atualiza!

### Passo 3: Implementar Solução Permanente

Escolha uma:
- **Solução 1:** Endpoint manual (melhor para você atualizar via API)
- **Solução 2:** Django Admin (melhor para atualizar via interface web)
- **Solução 3:** Continuar com comandos diretos (temporário)

---

## 📋 PRÓXIMOS PASSOS

### Imediato (5 minutos):
```bash
# Atualizar payments 10 e 11 manualmente
docker compose exec backend python manage.py shell -c "..."
```

### Curto Prazo (1 hora):
- Implementar endpoint de atualização manual
- Ou configurar Django Admin com ações

### Longo Prazo:
- Contactar suporte do PaySuite sobre webhooks
- Perguntar se há endpoint de consulta de status
- Considerar trocar gateway se webhooks não funcionarem

---

## ❓ PERGUNTAS PARA O PAYSUITE

1. "Webhooks estão habilitados na minha conta?"
2. "Como posso verificar se webhooks estão sendo enviados?"
3. "Existe log de tentativas de webhook no dashboard?"
4. "Existe endpoint de API para consultar status de pagamento?"
5. "Preciso ativar webhooks manualmente na conta?"

---

**Status Atual:** 🔴 Webhooks não funcionam  
**Solução Temporária:** ✅ Atualização manual  
**Solução Permanente:** 🔄 Aguardando resposta PaySuite ou implementar polling
