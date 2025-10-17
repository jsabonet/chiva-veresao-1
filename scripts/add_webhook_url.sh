#!/bin/bash

# Script para adicionar WEBHOOK_BASE_URL ao .env do servidor

echo "=================================================="
echo "🔧 ADICIONANDO WEBHOOK_BASE_URL AO .ENV"
echo "=================================================="
echo ""

ENV_FILE="/home/chiva/chiva-veresao-1/.env"

# Verificar se variável já existe
if grep -q "^WEBHOOK_BASE_URL=" "$ENV_FILE"; then
    echo "⚠️  WEBHOOK_BASE_URL já existe no .env"
    echo ""
    echo "Valor atual:"
    grep "^WEBHOOK_BASE_URL=" "$ENV_FILE"
    echo ""
    echo -n "Deseja atualizar? (s/N): "
    read -r resposta
    
    if [ "$resposta" = "s" ] || [ "$resposta" = "S" ]; then
        # Remover linha antiga
        sed -i '/^WEBHOOK_BASE_URL=/d' "$ENV_FILE"
        echo "✅ Linha antiga removida"
    else
        echo "❌ Operação cancelada"
        exit 0
    fi
fi

# Adicionar nova configuração
echo "" >> "$ENV_FILE"
echo "# Webhook URL for PaySuite callbacks (MUST be publicly accessible)" >> "$ENV_FILE"
echo "# Updated: $(date '+%Y-%m-%d %H:%M:%S')" >> "$ENV_FILE"
echo "WEBHOOK_BASE_URL=https://chivacomputer.co.mz" >> "$ENV_FILE"

echo "✅ WEBHOOK_BASE_URL adicionado ao .env!"
echo ""
echo "Verificando configuração..."
echo ""
grep -A 1 "WEBHOOK_BASE_URL" "$ENV_FILE"
echo ""
echo "=================================================="
echo "🔄 PRÓXIMO PASSO: REINICIAR BACKEND"
echo "=================================================="
echo ""
echo "Execute:"
echo "  docker compose restart backend"
echo ""
echo "Depois monitore os logs:"
echo "  docker compose logs -f backend | grep -i webhook"
echo ""
echo "=================================================="
