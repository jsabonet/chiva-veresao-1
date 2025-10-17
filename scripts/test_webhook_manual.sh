#!/bin/bash
# Script para testar webhook manualmente com assinatura correta

echo "🧪 TESTE MANUAL DE WEBHOOK"
echo "=========================================="
echo ""

# Configuração
WEBHOOK_URL="https://chivacomputer.co.mz/api/cart/payments/webhook/"
WEBHOOK_SECRET="whsec_cd0a9e1a17e2d5d2a7cc49e9b431721f88d19b95d018f2ac"

# Teste 1: Payment #11 (deve ser PAID)
echo "📤 Teste 1: Simulando webhook para Payment #11 (PAID)..."
echo "   PaySuite ID: 1f0cee0f-b1fa-4490-8e5c-70bc37bc8c93"
echo ""

# Payload do webhook
PAYLOAD_11='{
  "event": "payment.paid",
  "data": {
    "id": "1f0cee0f-b1fa-4490-8e5c-70bc37bc8c93",
    "reference": "PAY000011",
    "status": "paid",
    "amount": "1.00",
    "method": "mpesa",
    "customer": {
      "name": "Test Customer",
      "email": "test@example.com"
    }
  }
}'

# Gerar assinatura (usando OpenSSL)
SIGNATURE_11=$(echo -n "$PAYLOAD_11" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

echo "🔐 Signature: $SIGNATURE_11"
echo ""

# Enviar webhook
RESPONSE_11=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE_11" \
  -d "$PAYLOAD_11")

HTTP_CODE_11=$(echo "$RESPONSE_11" | tail -n1)
BODY_11=$(echo "$RESPONSE_11" | sed '$d')

echo "📥 Response HTTP Code: $HTTP_CODE_11"
echo "📥 Response Body: $BODY_11"
echo ""

if [ "$HTTP_CODE_11" = "200" ]; then
    echo "✅ Webhook aceito com sucesso!"
else
    echo "❌ Webhook rejeitado (código $HTTP_CODE_11)"
fi

echo ""
echo "=========================================="
echo ""

# Teste 2: Payment #10 (deve ser FAILED)
echo "📤 Teste 2: Simulando webhook para Payment #10 (FAILED)..."
echo "   PaySuite ID: 45782747-fbeb-482a-8cf0-c562ae531f37"
echo ""

PAYLOAD_10='{
  "event": "payment.failed",
  "data": {
    "id": "45782747-fbeb-482a-8cf0-c562ae531f37",
    "reference": "PAY000010",
    "status": "failed",
    "amount": "1.00",
    "method": "mpesa",
    "customer": {
      "name": "Test Customer",
      "email": "test@example.com"
    }
  }
}'

SIGNATURE_10=$(echo -n "$PAYLOAD_10" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

echo "🔐 Signature: $SIGNATURE_10"
echo ""

RESPONSE_10=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE_10" \
  -d "$PAYLOAD_10")

HTTP_CODE_10=$(echo "$RESPONSE_10" | tail -n1)
BODY_10=$(echo "$RESPONSE_10" | sed '$d')

echo "📥 Response HTTP Code: $HTTP_CODE_10"
echo "📥 Response Body: $BODY_10"
echo ""

if [ "$HTTP_CODE_10" = "200" ]; then
    echo "✅ Webhook aceito com sucesso!"
else
    echo "❌ Webhook rejeitado (código $HTTP_CODE_10)"
fi

echo ""
echo "=========================================="
echo ""
echo "🔍 Verificando status dos payments no banco de dados..."
echo ""

docker compose exec backend python manage.py shell -c "
from cart.models import Payment
import json

print('📊 STATUS APÓS WEBHOOKS SIMULADOS:')
print('=' * 60)

for pid in [10, 11]:
    try:
        p = Payment.objects.get(id=pid)
        print(f'\nPayment #{pid}:')
        print(f'  💳 Status: {p.status}')
        print(f'  📦 Order Status: {p.order.status if p.order else \"N/A\"}')
        print(f'  📋 Has webhook event: {\"event\" in (p.raw_response or {})}')
        
        if p.raw_response and 'event' in p.raw_response:
            print(f'  🎯 Webhook event: {p.raw_response[\"event\"]}')
            print(f'  ✅ WEBHOOK CHEGOU E FOI PROCESSADO!')
        else:
            print(f'  ❌ Webhook ainda não chegou')
    except Exception as e:
        print(f'\n❌ Erro ao buscar Payment #{pid}: {e}')

print('\n' + '=' * 60)
"

echo ""
echo "✅ Teste completo!"
echo ""
echo "📋 RESULTADO ESPERADO:"
echo "   - Payment #11: status = 'paid'"
echo "   - Payment #10: status = 'failed'"
echo "   - Ambos devem ter 'event' no raw_response"
