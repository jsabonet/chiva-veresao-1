#!/bin/bash
# Script para verificar se WEBHOOK_BASE_URL está configurado corretamente

echo "🔍 Verificando WEBHOOK_BASE_URL no Django..."
echo ""

docker compose exec backend python manage.py shell -c "
from django.conf import settings

print('=' * 60)
print('📋 WEBHOOK CONFIGURATION')
print('=' * 60)
print()
print(f'✓ WEBHOOK_BASE_URL: {settings.WEBHOOK_BASE_URL}')
print(f'✓ DEBUG: {settings.DEBUG}')
print(f'✓ PAYSUITE_WEBHOOK_SECRET: {settings.PAYSUITE_WEBHOOK_SECRET[:20]}...')
print()
print('📍 Expected webhook URLs:')
print(f'   Callback: {settings.WEBHOOK_BASE_URL.rstrip(\"/\")}/api/cart/payments/webhook/')
print(f'   Return:   {settings.WEBHOOK_BASE_URL.rstrip(\"/\")}/orders/status')
print()
print('=' * 60)

# Verificar últimos pagamentos
from cart.models import Payment
recent_payments = Payment.objects.all().order_by('-id')[:3]

print()
print('📊 RECENT PAYMENTS:')
print('=' * 60)
for p in recent_payments:
    print(f'Payment #{p.id}:')
    print(f'  Status: {p.status}')
    print(f'  Method: {p.method}')
    print(f'  Amount: {p.amount}')
    
    if p.raw_response:
        # Verificar se tem webhook data
        has_event = 'event' in p.raw_response
        print(f'  Has webhook event: {has_event}')
        
        if 'data' in p.raw_response and 'checkout_url' in p.raw_response['data']:
            print(f'  PaySuite ID: {p.raw_response[\"data\"].get(\"id\", \"N/A\")}')
    print()
"

echo ""
echo "✅ Verificação completa!"
