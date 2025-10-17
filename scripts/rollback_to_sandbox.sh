#!/bin/bash
# Script para reverter de Production para Sandbox

echo "🔙 ROLLBACK PARA SANDBOX MODE"
echo "============================================"
echo ""

# Listar backups disponíveis
echo "📁 Backups disponíveis:"
ls -1 .env.sandbox.backup.* 2>/dev/null | nl

if [ ! -f .env.sandbox.backup.* ]; then
    echo "❌ Nenhum backup encontrado!"
    echo "💡 Você pode criar manualmente:"
    echo "   sed -i 's/PAYSUITE_TEST_MODE=production/PAYSUITE_TEST_MODE=sandbox/g' .env"
    echo "   docker compose restart backend"
    exit 1
fi

echo ""
read -p "Escolha o número do backup (ou Enter para o mais recente): " BACKUP_NUM

if [ -z "$BACKUP_NUM" ]; then
    # Usar backup mais recente
    BACKUP_FILE=$(ls -t .env.sandbox.backup.* | head -1)
else
    # Usar backup escolhido
    BACKUP_FILE=$(ls -1 .env.sandbox.backup.* | sed -n "${BACKUP_NUM}p")
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup não encontrado: $BACKUP_FILE"
    exit 1
fi

echo ""
echo "📦 Restaurando de: $BACKUP_FILE"
echo ""

# Backup do .env atual (production)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp .env .env.production.backup.$TIMESTAMP
echo "✅ Backup do .env production criado: .env.production.backup.$TIMESTAMP"

# Restaurar backup
cp "$BACKUP_FILE" .env
echo "✅ .env restaurado de: $BACKUP_FILE"

# Verificar
CURRENT_MODE=$(grep "PAYSUITE_TEST_MODE=" .env | cut -d'=' -f2)
echo "✅ Modo agora: $CURRENT_MODE"

echo ""
echo "🔄 Reiniciando containers..."
docker compose restart backend frontend

echo ""
echo "⏳ Aguardando 10 segundos..."
sleep 10

echo ""
echo "✅ ROLLBACK COMPLETO!"
echo ""
echo "📋 Sistema voltou para SANDBOX MODE"
echo "   - Pagamentos NÃO cobram dinheiro real"
echo "   - Webhooks NÃO serão enviados automaticamente"
echo "   - Use: bash scripts/update_payment_manual.sh"
echo ""
echo "🔍 Verificar configuração:"
echo "   docker compose exec backend python manage.py shell -c \\"
echo "     'from django.conf import settings; print(f\"Mode: {settings.PAYSUITE_TEST_MODE}\")'"
