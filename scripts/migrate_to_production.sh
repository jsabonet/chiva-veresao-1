#!/bin/bash
# Script para migrar de Sandbox para Production Mode
# ⚠️ ATENÇÃO: Após executar, pagamentos cobrarão dinheiro real!

echo "🚀 MIGRAÇÃO PARA PRODUCTION MODE"
echo "============================================"
echo ""
echo "⚠️  ATENÇÃO: Após esta migração:"
echo "   - Pagamentos cobrarão dinheiro REAL"
echo "   - Webhooks serão enviados automaticamente"
echo "   - Você não poderá testar sem custo"
echo ""
read -p "Tem certeza que quer continuar? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo ""
    echo "❌ Migração cancelada."
    echo "💡 Execute novamente quando estiver pronto."
    exit 0
fi

echo ""
echo "============================================"
echo "INICIANDO MIGRAÇÃO..."
echo "============================================"
echo ""

# Passo 1: Backup completo
echo "📦 Passo 1/6: Criando backups..."
echo ""

# Backup do .env
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp .env .env.sandbox.backup.$TIMESTAMP
echo "✅ .env → .env.sandbox.backup.$TIMESTAMP"

# Backup do banco de dados
echo "🗄️  Criando backup do banco de dados..."
docker compose exec -T backend python manage.py dumpdata > backup_db_$TIMESTAMP.json
echo "✅ Database → backup_db_$TIMESTAMP.json"

# Backup de payments
docker compose exec -T backend python manage.py shell -c "
from cart.models import Payment
import json

payments = Payment.objects.all().values(
    'id', 'status', 'method', 'amount', 
    'paysuite_reference', 'created_at'
)
print(json.dumps(list(payments), indent=2, default=str))
" > backup_payments_$TIMESTAMP.json
echo "✅ Payments → backup_payments_$TIMESTAMP.json"

echo ""
echo "============================================"

# Passo 2: Verificar estado atual
echo "🔍 Passo 2/6: Verificando estado atual..."
echo ""

CURRENT_MODE=$(grep "PAYSUITE_TEST_MODE=" .env | cut -d'=' -f2)
echo "   Modo Atual: $CURRENT_MODE"

PENDING_PAYMENTS=$(docker compose exec -T backend python manage.py shell -c "
from cart.models import Payment
count = Payment.objects.filter(status='pending').count()
print(count)
" | tail -1)
echo "   Payments Pendentes: $PENDING_PAYMENTS"

if [ "$PENDING_PAYMENTS" -gt 0 ]; then
    echo ""
    echo "⚠️  Você tem $PENDING_PAYMENTS payments pendentes."
    echo "💡 Considere resolver antes de migrar:"
    docker compose exec -T backend python manage.py shell -c "
from cart.models import Payment
pending = Payment.objects.filter(status='pending')
for p in pending:
    print(f'   - Payment #{p.id}: {p.amount} MZN ({p.method})')
"
    echo ""
    read -p "Continuar mesmo assim? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
        echo "❌ Migração cancelada."
        exit 0
    fi
fi

echo ""
echo "============================================"

# Passo 3: Atualizar .env
echo "🔧 Passo 3/6: Atualizando configuração..."
echo ""

# Mudar PAYSUITE_TEST_MODE
sed -i.bak 's/PAYSUITE_TEST_MODE=sandbox/PAYSUITE_TEST_MODE=production/g' .env

# Verificar mudança
NEW_MODE=$(grep "PAYSUITE_TEST_MODE=" .env | cut -d'=' -f2)
echo "✅ PAYSUITE_TEST_MODE: $CURRENT_MODE → $NEW_MODE"

# Garantir que DEBUG está False
sed -i 's/DEBUG=True/DEBUG=False/g' .env
DEBUG_VALUE=$(grep "^DEBUG=" .env | cut -d'=' -f2)
echo "✅ DEBUG: $DEBUG_VALUE"

echo ""
echo "============================================"

# Passo 4: Reiniciar containers
echo "🔄 Passo 4/6: Reiniciando containers..."
echo ""

docker compose restart backend frontend

echo "⏳ Aguardando containers iniciarem (10 segundos)..."
sleep 10

echo ""
echo "============================================"

# Passo 5: Verificar configuração no Django
echo "✅ Passo 5/6: Verificando Django..."
echo ""

docker compose exec -T backend python manage.py shell -c "
from django.conf import settings
print('📋 CONFIGURAÇÃO PRODUCTION:')
print('=' * 60)
print(f'DEBUG: {settings.DEBUG}')
print(f'WEBHOOK_BASE_URL: {settings.WEBHOOK_BASE_URL}')
print(f'PAYSUITE_WEBHOOK_SECRET: {settings.PAYSUITE_WEBHOOK_SECRET[:20]}...')
print('=' * 60)
print()
print('✅ Django configurado em PRODUCTION MODE')
"

echo ""
echo "============================================"

# Passo 6: Instruções finais
echo "🎯 Passo 6/6: Próximos passos..."
echo ""
echo "✅ MIGRAÇÃO COMPLETA!"
echo ""
echo "📋 PRÓXIMOS PASSOS CRÍTICOS:"
echo ""
echo "1. 🧪 TESTAR COM PAGAMENTO PEQUENO (1 MZN):"
echo "   - Acesse: https://chivacomputer.co.mz"
echo "   - Crie um pedido de 1 MZN"
echo "   - Pague com M-Pesa ou E-Mola"
echo "   - Verifique se webhook chega automaticamente"
echo ""
echo "2. 🔍 MONITORAR LOGS:"
echo "   docker compose logs -f backend | grep -i webhook"
echo ""
echo "3. ✅ VERIFICAR STATUS DO PAYMENT:"
echo "   docker compose exec backend python manage.py shell -c \\"
echo "     'from cart.models import Payment; \\"
echo "     p = Payment.objects.latest(\"id\"); \\"
echo "     print(f\"Payment #{p.id}: {p.status}\")'"
echo ""
echo "4. 🔙 SE PRECISAR REVERTER:"
echo "   cp .env.sandbox.backup.$TIMESTAMP .env"
echo "   docker compose restart backend"
echo ""
echo "============================================"
echo ""
echo "📁 BACKUPS CRIADOS:"
echo "   - .env.sandbox.backup.$TIMESTAMP"
echo "   - backup_db_$TIMESTAMP.json"
echo "   - backup_payments_$TIMESTAMP.json"
echo ""
echo "🚨 LEMBRE-SE: Agora pagamentos cobram dinheiro REAL!"
echo ""
echo "✅ Sistema pronto para produção! 🎉"
