#!/bin/bash
# Script para atualizar payment manualmente (para usar em sandbox)

echo "💳 ATUALIZAÇÃO MANUAL DE PAYMENT"
echo "================================"
echo ""

# Verificar último payment
echo "🔍 Verificando último payment..."
LAST_PAYMENT=$(docker compose exec -T backend python manage.py shell -c "
from cart.models import Payment
p = Payment.objects.latest('id')
print(f'{p.id}|{p.status}|{p.method}|{p.amount}|{p.paysuite_reference}')
" | tail -1)

PAYMENT_ID=$(echo "$LAST_PAYMENT" | cut -d'|' -f1)
STATUS=$(echo "$LAST_PAYMENT" | cut -d'|' -f2)
METHOD=$(echo "$LAST_PAYMENT" | cut -d'|' -f3)
AMOUNT=$(echo "$LAST_PAYMENT" | cut -d'|' -f4)
REFERENCE=$(echo "$LAST_PAYMENT" | cut -d'|' -f5)

echo ""
echo "📊 ÚLTIMO PAYMENT:"
echo "   ID: $PAYMENT_ID"
echo "   Status Atual: $STATUS"
echo "   Method: $METHOD"
echo "   Amount: $AMOUNT MZN"
echo "   Reference: $REFERENCE"
echo ""

# Se já está pago, não fazer nada
if [ "$STATUS" = "paid" ]; then
    echo "✅ Payment já está PAID, nada a fazer."
    exit 0
fi

# Perguntar novo status
echo "🎯 Como atualizar este payment?"
echo "   1) PAID (pagamento bem-sucedido)"
echo "   2) FAILED (pagamento falhou)"
echo "   3) Cancelar (não fazer nada)"
echo ""
read -p "Escolha (1/2/3): " CHOICE

case $CHOICE in
    1)
        NEW_STATUS="paid"
        echo ""
        echo "✅ Atualizando para PAID..."
        ;;
    2)
        NEW_STATUS="failed"
        echo ""
        echo "❌ Atualizando para FAILED..."
        ;;
    *)
        echo ""
        echo "🚫 Cancelado."
        exit 0
        ;;
esac

# Atualizar payment
docker compose exec -T backend python manage.py shell -c "
from cart.models import Payment

p = Payment.objects.get(id=$PAYMENT_ID)
old_status = p.status
p.status = '$NEW_STATUS'
p.save(update_fields=['status'])

if p.order:
    p.order.status = '$NEW_STATUS'
    p.order.save(update_fields=['status'])
    print(f'✅ Payment {p.id}: {old_status} → $NEW_STATUS')
    print(f'✅ Order {p.order.id}: status → $NEW_STATUS')
else:
    print(f'✅ Payment {p.id}: {old_status} → $NEW_STATUS')
    print(f'⚠️  No order linked to this payment')
"

echo ""
echo "✅ Atualização completa!"
echo ""
echo "🌐 Verifique no frontend se o status mudou:"
echo "   https://chivacomputer.co.mz/orders/status?order_id=..."
