#!/bin/bash
# Script para testar webhook manualmente (simular PaySuite)

echo "🧪 Testando webhook endpoint manualmente..."
echo ""

# Pegar o webhook secret
WEBHOOK_SECRET=$(ssh jsabonete09@157.230.16.193 "cd /home/jsabonete09/versao_1_chiva && docker compose exec -T backend python manage.py shell -c \"from django.conf import settings; print(settings.PAYSUITE_WEBHOOK_SECRET)\"")

echo "🔐 Webhook Secret: ${WEBHOOK_SECRET:0:20}..."
echo ""

# Simular webhook de pagamento PAGO (payment 11)
echo "📤 Enviando webhook simulado para Payment #11 (PAGO)..."
curl -X POST https://chivacomputer.co.mz/api/cart/payments/webhook/ \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d '{
    "event": "payment.paid",
    "data": {
      "id": "1f0cee0f-b1fa-4490-8e5c-70bc37bc8c93",
      "reference": "PAY000011",
      "status": "paid",
      "amount": "1.00",
      "method": "mpesa"
    }
  }'

echo ""
echo ""

# Simular webhook de pagamento FALHOU (payment 10)
echo "📤 Enviando webhook simulado para Payment #10 (FALHOU)..."
curl -X POST https://chivacomputer.co.mz/api/cart/payments/webhook/ \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d '{
    "event": "payment.failed",
    "data": {
      "id": "45782747-fbeb-482a-8cf0-c562ae531f37",
      "reference": "PAY000010",
      "status": "failed",
      "amount": "1.00",
      "method": "mpesa"
    }
  }'

echo ""
echo ""
echo "✅ Webhooks simulados enviados!"
echo ""
echo "🔍 Verificando status dos payments..."
ssh jsabonete09@157.230.16.193 "cd /home/jsabonete09/versao_1_chiva && docker compose exec -T backend python manage.py shell -c \"
from cart.models import Payment
import json

print('\\n📊 PAYMENT STATUS AFTER SIMULATED WEBHOOKS:')
print('=' * 60)

for pid in [10, 11]:
    p = Payment.objects.get(id=pid)
    print(f'\\nPayment #{pid}:')
    print(f'  Status: {p.status}')
    print(f'  Order Status: {p.order.status if p.order else \"N/A\"}')
    print(f'  Has webhook event: {\"event\" in (p.raw_response or {})}')
    
    if p.raw_response and 'event' in p.raw_response:
        print(f'  Webhook event: {p.raw_response[\"event\"]}')

print('\\n' + '=' * 60)
\""

echo ""
echo "✅ Teste completo!"
