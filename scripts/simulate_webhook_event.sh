#!/bin/bash
# Simulate a Paysuite webhook with proper HMAC signature
# Usage:
#   bash scripts/simulate_webhook_event.sh paid <reference_uuid> [payment_id] [amount] [method]
#   bash scripts/simulate_webhook_event.sh failed <reference_uuid> [payment_id] [amount] [method]
# Example:
#   bash scripts/simulate_webhook_event.sh paid 4473cd66-6fda-4d1e-91bc-2e19682394c8 12 1.00 mpesa

set -euo pipefail

EVENT_INPUT=${1:-}
REFERENCE=${2:-}
PAYMENT_ID=${3:-}
AMOUNT=${4:-1.00}
METHOD=${5:-mpesa}

if [ -z "$EVENT_INPUT" ] || [ -z "$REFERENCE" ]; then
  echo "Usage: $0 <paid|failed> <reference_uuid> [payment_id] [amount] [method]"
  exit 1
fi

case "$EVENT_INPUT" in
  paid)
    EVENT="payment.paid"
    ;;
  failed)
    EVENT="payment.failed"
    ;;
  success)
    EVENT="payment.success"
    ;;
  *)
    echo "Unsupported event: $EVENT_INPUT (use paid|failed|success)"
    exit 1
    ;;
esac

WEBHOOK_URL=${WEBHOOK_URL:-"https://chivacomputer.co.mz/api/cart/payments/webhook/"}

# Retrieve webhook secret from running Django
echo "🔐 Fetching PAYSUITE_WEBHOOK_SECRET from Django..."
SECRET=$(docker compose exec -T backend python manage.py shell -c "from django.conf import settings; print(settings.PAYSUITE_WEBHOOK_SECRET)" | tr -d '\r')
if [ -z "$SECRET" ]; then
  echo "❌ Could not retrieve webhook secret"
  exit 1
fi

# Build payload
PAYLOAD=$(cat <<JSON
{
  "event": "$EVENT",
  "data": {
    "id": "$REFERENCE",
    "reference": "$REFERENCE",
    "status": "${EVENT_INPUT}",
    "amount": "$AMOUNT",
    "method": "$METHOD"
  }${PAYMENT_ID:+, "metadata": {"order_id": $PAYMENT_ID, "note": "simulated"}}
}
JSON
)

# Compute signature (hex digest like many providers; server verifies best-effort)
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

echo "📤 Sending webhook: $EVENT for ref=$REFERENCE (payment_id=${PAYMENT_ID:-N/A})"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIG" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

echo "📥 HTTP $HTTP_CODE"
echo "📄 Body: $BODY"

# Show quick DB status if payment_id provided
if [ -n "${PAYMENT_ID:-}" ]; then
  echo "\n🔎 Verifying DB for payment_id=$PAYMENT_ID..."
  docker compose exec -T backend python manage.py shell -c "
from cart.models import Payment
try:
    p = Payment.objects.get(id=$PAYMENT_ID)
    print(f'Payment #{p.id}: status={p.status}, has_event={{"event" in (p.raw_response or {{}})}}')
    if p.order:
        print(f'Order #{p.order.id}: status={p.order.status}')
except Exception as e:
    print('Error:', e)
"
fi

echo "✅ Done"
