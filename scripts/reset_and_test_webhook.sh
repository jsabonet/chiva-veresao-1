#!/bin/bash
# Script para resetar payments e testar webhook novamente

echo "🔄 RESETANDO PAYMENTS E TESTANDO NOVAMENTE"
echo "=========================================="
echo ""

# Resetar payments 10 e 11 para pending
echo "📋 Resetando payments 10 e 11 para 'pending'..."
docker compose exec backend python manage.py shell -c "
from cart.models import Payment

for pid in [10, 11]:
    p = Payment.objects.get(id=pid)
    p.status = 'pending'
    p.save(update_fields=['status'])
    
    if p.order:
        p.order.status = 'pending'
        p.order.save(update_fields=['status'])
    
    print(f'🔄 Payment {pid} reset to pending')
"

echo ""
echo "✅ Payments resetados!"
echo ""
echo "⏳ Aguardando 2 segundos..."
sleep 2
echo ""

# Executar teste de webhook
echo "🧪 Executando teste de webhook..."
bash scripts/test_webhook_manual.sh
