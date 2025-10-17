#!/bin/bash
# Script para corrigir DEBUG e testar webhook

echo "🔧 CORRIGINDO CONFIGURAÇÕES DE PRODUÇÃO..."
echo ""

# Backup do .env atual
echo "📦 Fazendo backup do .env..."
cp backend/.env backend/.env.backup.$(date +%Y%m%d_%H%M%S)

# Corrigir DEBUG=False
echo "🔧 Desativando DEBUG mode..."
sed -i 's/DEBUG=True/DEBUG=False/g' backend/.env

# Verificar mudança
echo "✅ DEBUG agora está:"
grep "DEBUG=" backend/.env

echo ""
echo "🔄 Reiniciando containers..."
docker compose restart backend

echo ""
echo "⏳ Aguardando 5 segundos..."
sleep 5

echo ""
echo "✅ Verificando se backend está rodando..."
docker compose ps backend

echo ""
echo "🔍 Verificando configuração no Django..."
docker compose exec backend python manage.py shell -c "
from django.conf import settings
print('DEBUG:', settings.DEBUG)
print('WEBHOOK_BASE_URL:', settings.WEBHOOK_BASE_URL)
print('PAYSUITE_WEBHOOK_SECRET:', settings.PAYSUITE_WEBHOOK_SECRET[:20] + '...')
"

echo ""
echo "✅ Configuração corrigida!"
echo ""
echo "📋 PRÓXIMO PASSO: Testar webhook simulado"
echo "Execute: bash scripts/test_webhook_manual.sh"
