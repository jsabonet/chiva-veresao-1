#!/bin/bash

# Script para verificar todos os payments recentes e ver se algum webhook chegou

echo "=================================================="
echo "🔍 VERIFICAÇÃO DE WEBHOOKS NO BANCO DE DADOS"
echo "=================================================="
echo ""

docker compose exec backend python manage.py shell << 'EOF'
from cart.models import Payment
import json
from datetime import datetime, timedelta

# Buscar últimos 20 payments
recent = Payment.objects.all().order_by('-id')[:20]

print(f"Total de payments recentes: {recent.count()}\n")
print("=" * 80)

webhooks_received = 0
webhooks_missing = 0

for p in recent:
    has_webhook = 'event' in (p.raw_response or {})
    
    if has_webhook:
        webhooks_received += 1
        emoji = "✅"
    else:
        webhooks_missing += 1
        emoji = "❌"
    
    print(f"{emoji} Payment #{p.id}")
    print(f"   Status: {p.status}")
    print(f"   Created: {p.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   PaySuite Ref: {p.paysuite_reference}")
    print(f"   Has Webhook: {has_webhook}")
    
    if p.raw_response:
        if 'event' in p.raw_response:
            print(f"   Webhook Event: {p.raw_response.get('event')}")
        else:
            print(f"   Raw Response Keys: {list(p.raw_response.keys())}")
    else:
        print(f"   Raw Response: None")
    
    print("-" * 80)

print("\n" + "=" * 80)
print(f"📊 RESUMO:")
print(f"   ✅ Webhooks recebidos: {webhooks_received}")
print(f"   ❌ Webhooks NÃO recebidos: {webhooks_missing}")
print("=" * 80)

if webhooks_missing == recent.count():
    print("\n🚨 ALERTA: NENHUM WEBHOOK FOI RECEBIDO!")
    print("   O PaySuite NÃO está enviando webhooks para o servidor.")
    print("   Causa provável: URL no dashboard ainda está incorreta.")
elif webhooks_received == 0 and webhooks_missing > 0:
    print("\n⚠️  PROBLEMA: Webhooks não estão chegando")
elif webhooks_received > 0:
    print(f"\n✅ PARCIALMENTE FUNCIONANDO:")
    print(f"   {webhooks_received}/{recent.count()} webhooks chegaram")

EOF

echo ""
echo "=================================================="
echo "💡 ANÁLISE"
echo "=================================================="
echo ""
echo "Se NENHUM webhook foi recebido, o problema é:"
echo "1. URL no PaySuite dashboard está incorreta"
echo "2. PaySuite não está configurado para enviar webhooks"
echo "3. WEBHOOK_BASE_URL no .env está incorreto"
echo ""
echo "Verificar:"
echo "  cat .env | grep WEBHOOK_BASE_URL"
echo ""
echo "=================================================="
