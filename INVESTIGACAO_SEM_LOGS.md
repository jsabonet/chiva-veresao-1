# 🔍 INVESTIGAÇÃO: Webhook Está Chegando em Produção?

## 🎯 PROBLEMA

- ✅ Dashboard PaySuite configurado
- ✅ WEBHOOK_BASE_URL configurado
- ✅ Endpoint acessível (testado)
- ❌ Status continua "pending" para sempre
- ❌ **Não sabemos se webhook está chegando** (sem acesso a logs)

## 💡 SOLUÇÃO: Verificar Banco de Dados Diretamente

O webhook atualiza o campo `raw_response` do Payment. Vamos verificar!

### Método 1: Verificar Payment no Banco

```bash
# SSH no servidor
ssh root@157.230.16.193

# Entrar no container
docker compose exec backend bash

# Verificar último payment
python manage.py shell -c "
from cart.models import Payment
import json

# Pegar payment_id 11 (do seu teste)
p = Payment.objects.get(id=11)

print('=' * 60)
print('PAYMENT ID:', p.id)
print('Status:', p.status)
print('PaySuite Reference:', p.paysuite_reference)
print('=' * 60)
print('RAW RESPONSE:')
print(json.dumps(p.raw_response, indent=2))
print('=' * 60)
"
```

### O Que Procurar:

#### ✅ SE WEBHOOK CHEGOU:
```json
{
  "event": "payment.success",  // ← Evento do webhook!
  "data": {
    "id": "1f0cee0f-b1fa-4490-8e5c-70bc37bc8c93",
    "status": "paid",
    "amount": 988000.00
  }
}
```

#### ❌ SE WEBHOOK NÃO CHEGOU:
```json
{
  "data": {
    "id": "1f0cee0f-b1fa-4490-8e5c-70bc37bc8c93",
    "checkout_url": "https://paysuite.tech/checkout/...",
    "reference": "ORD000011"
  },
  "status": "success"
}
```
**Nota:** Sem campo `"event"` = webhook nunca chegou!

---

## 🔍 VERIFICAÇÃO ADICIONAL: Histórico de Webhooks

### Método 2: Criar Endpoint de Debug

Vamos adicionar um endpoint que mostra se webhooks estão chegando:

```python
# backend/cart/views.py - Adicionar esta view

@api_view(['GET'])
@permission_classes([AllowAny])
def debug_webhook_history(request):
    """Debug endpoint to check webhook history"""
    from .models import Payment
    from datetime import datetime, timedelta
    
    # Últimos 10 payments
    recent_payments = Payment.objects.all().order_by('-created_at')[:10]
    
    results = []
    for p in recent_payments:
        # Verificar se raw_response tem evento de webhook
        has_webhook = False
        webhook_event = None
        
        if p.raw_response and isinstance(p.raw_response, dict):
            if 'event' in p.raw_response:
                has_webhook = True
                webhook_event = p.raw_response.get('event')
        
        results.append({
            'id': p.id,
            'status': p.status,
            'paysuite_ref': p.paysuite_reference,
            'created_at': p.created_at.isoformat(),
            'has_webhook': has_webhook,
            'webhook_event': webhook_event,
            'raw_response_keys': list(p.raw_response.keys()) if p.raw_response else []
        })
    
    return Response({
        'total_checked': len(results),
        'webhooks_received': sum(1 for r in results if r['has_webhook']),
        'payments': results
    })
```

Depois acessar: `https://chivacomputer.co.mz/api/cart/debug-webhook-history/`

---

## 🎯 CENÁRIOS POSSÍVEIS

### Cenário 1: raw_response TEM "event" mas status não atualiza

**Significa:** Webhook está chegando, mas código de atualização tem bug

**Solução:** Verificar lógica do webhook handler

### Cenário 2: raw_response NÃO TEM "event"

**Significa:** Webhook NÃO está chegando

**Possíveis causas:**
1. ❌ URL no PaySuite dashboard ainda está errada
2. ❌ PaySuite não está enviando (problema deles)
3. ❌ Webhook secret está errado (rejeitado antes de processar)
4. ❌ WEBHOOK_BASE_URL no .env está errado

### Cenário 3: Payment não existe no banco

**Significa:** Pedido não foi criado corretamente

**Verificar:** Endpoint `/initiate/` está funcionando?

---

## 🔧 SOLUÇÃO ALTERNATIVA: Polling Direto do PaySuite

Se webhook não funcionar, podemos fazer o **BACKEND** consultar o PaySuite periodicamente:

```python
# backend/cart/management/commands/poll_pending_payments.py

from django.core.management.base import BaseCommand
from cart.models import Payment
from cart.payments.paysuite import PaysuiteClient
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Poll PaySuite for pending payments status'

    def handle(self, *args, **options):
        # Buscar payments pending dos últimos 30 minutos
        since = datetime.now() - timedelta(minutes=30)
        pending_payments = Payment.objects.filter(
            status='pending',
            created_at__gte=since
        )
        
        self.stdout.write(f'Found {pending_payments.count()} pending payments')
        
        client = PaysuiteClient()
        
        for payment in pending_payments:
            try:
                # Consultar status no PaySuite
                result = client.get_payment_status(payment.paysuite_reference)
                
                self.stdout.write(f'Payment {payment.id}: {result.get("status")}')
                
                # Atualizar status
                if result.get('status') == 'paid':
                    payment.status = 'paid'
                    payment.raw_response = result
                    payment.save()
                    
                    # Sincronizar order
                    if payment.order:
                        payment.order.status = 'paid'
                        payment.order.save()
                    
                    self.stdout.write(self.style.SUCCESS(
                        f'✅ Updated payment {payment.id} to paid'
                    ))
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'❌ Error checking payment {payment.id}: {e}'
                ))
```

Executar via cron a cada 1 minuto:
```bash
* * * * * cd /home/chiva/chiva-veresao-1 && docker compose exec -T backend python manage.py poll_pending_payments
```

---

## 📋 AÇÕES IMEDIATAS

### 1. Verificar Payment no Banco (URGENTE)
```bash
docker compose exec backend python manage.py shell -c "from cart.models import Payment; p = Payment.objects.get(id=11); print('Status:', p.status); print('Has webhook event:', 'event' in (p.raw_response or {})); print('Keys:', list(p.raw_response.keys()) if p.raw_response else 'None')"
```

### 2. Se webhook NÃO está chegando:

#### Opção A: Verificar URL no PaySuite Dashboard NOVAMENTE
- Confirmar que salvou
- Verificar se não tem espaços extras
- Verificar protocolo (https://)

#### Opção B: Testar Webhook Manualmente
```bash
# Do servidor, simular webhook do PaySuite
curl -X POST http://localhost:8000/api/cart/payments/webhook/ \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $(echo -n '{"event":"payment.success","data":{"id":"1f0cee0f-b1fa-4490-8e5c-70bc37bc8c93","status":"paid"}}' | openssl dgst -sha256 -hmac 'whsec_cd0a9e1a17e2d5d2a7cc49e9b431721f88d19b95d018f2ac' | cut -d' ' -f2)" \
  -d '{
    "event": "payment.success",
    "data": {
      "id": "1f0cee0f-b1fa-4490-8e5c-70bc37bc8c93",
      "status": "paid",
      "amount": 988000.00
    }
  }'
```

Depois verificar se payment 11 mudou para "paid".

#### Opção C: Implementar Polling como Backup
Adicionar comando de polling e configurar cron.

---

## 🎯 PRÓXIMOS PASSOS

1. **URGENTE:** Verificar raw_response do payment 11 no banco
2. **Se tem "event":** Bug no código de atualização
3. **Se NÃO tem "event":** Webhook não está chegando
4. **Solução temporária:** Implementar polling como backup

---

**Prioridade:** 🔥🔥🔥 CRÍTICA  
**Tempo:** 2 minutos para verificar banco  
**Decisão:** Depende do que encontrarmos no banco
