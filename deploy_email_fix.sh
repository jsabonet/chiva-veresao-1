#!/bin/bash

# Script de Deploy Rápido - Adicionar sib-api-v3-sdk ao Container
# ================================================================

echo "=================================================="
echo "🚀 DEPLOY: Adicionando sib-api-v3-sdk ao container"
echo "=================================================="

# 1. Commit das mudanças
echo ""
echo "📝 1. Commitando mudanças..."
git add backend/requirements.prod.txt
git commit -m "fix: Adiciona sib-api-v3-sdk ao requirements.prod.txt para envio de emails"

# 2. Push para repositório
echo ""
echo "📤 2. Fazendo push..."
git push origin main

# 3. Instruções para o servidor
echo ""
echo "=================================================="
echo "✅ COMMIT E PUSH CONCLUÍDOS!"
echo "=================================================="
echo ""
echo "Agora, NO SERVIDOR, execute os seguintes comandos:"
echo ""
echo "# 1. Entrar no diretório do projeto"
echo "cd /home/chiva/chiva-veresao-1"
echo ""
echo "# 2. Fazer pull das mudanças"
echo "git pull origin main"
echo ""
echo "# 3. Rebuild e restart do container backend"
echo "docker compose down"
echo "docker compose build backend"
echo "docker compose up -d"
echo ""
echo "# 4. Verificar logs"
echo "docker compose logs -f backend"
echo ""
echo "# 5. Testar envio de emails"
echo "docker compose exec backend bash"
echo "python teste_verificacao_emails_final.py"
echo ""
echo "=================================================="
echo "⏱️  Tempo estimado: 5-10 minutos"
echo "=================================================="
