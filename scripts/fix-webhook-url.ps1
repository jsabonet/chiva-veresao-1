# 🔧 Script de Correção Rápida - Webhook URL

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "CORREÇÃO: Webhook URL de Produção" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar configuração atual
Write-Host "1️⃣  Verificando configuração atual..." -ForegroundColor Yellow
cd backend
$currentConfig = python -c "from django.conf import settings; import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings'); import django; django.setup(); print(settings.WEBHOOK_BASE_URL)" 2>$null

if ($currentConfig) {
    Write-Host "   ✅ WEBHOOK_BASE_URL atual: $currentConfig" -ForegroundColor Green
    if ($currentConfig -like "*127.0.0.1*" -or $currentConfig -like "*localhost*") {
        Write-Host "   ⚠️  AVISO: URL configurada para localhost!" -ForegroundColor Red
        Write-Host "   ⚠️  Esta configuração NÃO funciona em produção!" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Erro ao ler configuração" -ForegroundColor Red
}

Write-Host ""

# 2. Verificar arquivo .env
Write-Host "2️⃣  Verificando arquivo .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    $webhookLine = $envContent | Select-String -Pattern "^WEBHOOK_BASE_URL="
    
    if ($webhookLine) {
        Write-Host "   ✅ Linha encontrada no .env:" -ForegroundColor Green
        Write-Host "      $webhookLine" -ForegroundColor Cyan
    } else {
        Write-Host "   ⚠️  WEBHOOK_BASE_URL não encontrado no .env" -ForegroundColor Yellow
        Write-Host "   💡 Adicionando configuração de produção..." -ForegroundColor Cyan
        
        # Adicionar ao .env
        Add-Content ".env" "`n# Webhook URL for PaySuite callbacks (MUST be publicly accessible)"
        Add-Content ".env" "WEBHOOK_BASE_URL=https://chivacomputer.co.mz"
        
        Write-Host "   ✅ Configuração adicionada ao .env!" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Arquivo .env não encontrado!" -ForegroundColor Red
}

Write-Host ""

# 3. Criar arquivo de exemplo para produção
Write-Host "3️⃣  Criando arquivo de exemplo para produção..." -ForegroundColor Yellow
$prodEnvExample = @"
# ========================================
# CONFIGURAÇÃO DE PRODUÇÃO
# ========================================
# Arquivo: backend/.env.production
# 
# Este arquivo contém as variáveis de ambiente
# necessárias para o ambiente de produção

# Database Configuration (Production PostgreSQL)
DB_NAME=chiva_db
DB_USER=postgres
DB_PASSWORD=sua_senha_segura_aqui
DB_HOST=localhost
DB_PORT=5432

# Security (IMPORTANTE: Use uma chave secreta forte!)
SECRET_KEY=django-insecure-MUDE-ESTA-CHAVE-PARA-PRODUCAO
DEBUG=False
ALLOWED_HOSTS=chivacomputer.co.mz,157.230.16.193

# Firebase Configuration
DEV_FIREBASE_ACCEPT_UNVERIFIED=0
ENABLE_TOKEN_PAYLOAD_DEBUG=0
FIREBASE_PROJECT_ID=chiva-version-1
DEV_TREAT_ALL_AUTH_AS_ADMIN=0
FIREBASE_ADMIN_EMAILS=jsabonete09@gmail.com

# CORS Settings (Production)
CORS_ALLOWED_ORIGINS=https://chivacomputer.co.mz

# Media and Static Files
MEDIA_ROOT=/home/chiva/chiva-veresao-1/media/
STATIC_ROOT=/home/chiva/chiva-veresao-1/static/

# ========================================
# PAYSUITE CONFIGURATION
# ========================================

# PaySuite Base URL (use proxy se necessário)
PAYSUITE_BASE_URL=https://paysuite-proxy.jsabonete09.workers.dev

# PaySuite API Key (chave de produção)
PAYSUITE_API_KEY=735|X8mGsE4xIXgJwdi6wQETXQn1LExmz4LW4TZiL8j908f03b48

# PaySuite Webhook Secret (para validação de assinatura)
PAYSUITE_WEBHOOK_SECRET=whsec_cd0a9e1a17e2d5d2a7cc49e9b431721f88d19b95d018f2ac

# PaySuite Mode
PAYSUITE_TEST_MODE=production

# ========================================
# WEBHOOK CONFIGURATION (CRÍTICO!)
# ========================================

# URL base pública para callbacks do PaySuite
# DEVE ser acessível publicamente pela internet
# NUNCA use localhost ou 127.0.0.1 em produção!
WEBHOOK_BASE_URL=https://chivacomputer.co.mz

# ========================================
# PAYMENT LIMITS
# ========================================
MAX_TEST_AMOUNT=50000.00
MIN_TEST_AMOUNT=1.00
EMOLA_MAX_AMOUNT=100000.00
"@

Set-Content ".env.production" $prodEnvExample
Write-Host "   ✅ Arquivo .env.production criado!" -ForegroundColor Green

Write-Host ""

# 4. Mostrar instruções
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "📋 INSTRUÇÕES PARA PRODUÇÃO" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Para corrigir o problema em PRODUÇÃO:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SSH no servidor:" -ForegroundColor White
Write-Host "   ssh root@157.230.16.193" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Editar o arquivo .env:" -ForegroundColor White
Write-Host "   nano /home/chiva/chiva-veresao-1/.env" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Adicionar/modificar a linha:" -ForegroundColor White
Write-Host "   WEBHOOK_BASE_URL=https://chivacomputer.co.mz" -ForegroundColor Green
Write-Host ""
Write-Host "4. Salvar e sair:" -ForegroundColor White
Write-Host "   Ctrl+X, depois Y, depois Enter" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Reiniciar o backend:" -ForegroundColor White
Write-Host "   cd /home/chiva/chiva-veresao-1" -ForegroundColor Cyan
Write-Host "   docker compose restart backend" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Verificar os logs:" -ForegroundColor White
Write-Host "   docker compose logs -f backend" -ForegroundColor Cyan
Write-Host "   (Procure por: 'Using configured WEBHOOK_BASE_URL')" -ForegroundColor Yellow
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "📋 DASHBOARD PAYSUITE" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE: Você também precisa atualizar a URL no PaySuite!" -ForegroundColor Red
Write-Host ""
Write-Host "1. Acesse o dashboard do PaySuite" -ForegroundColor White
Write-Host "2. Vá para Settings → Webhooks" -ForegroundColor White
Write-Host "3. Localize: http://127.0.0.1:8000/api/cart/payments/webhook/" -ForegroundColor Red
Write-Host "4. Mude para: https://chivacomputer.co.mz/api/cart/payments/webhook/" -ForegroundColor Green
Write-Host "5. Salve as configurações" -ForegroundColor White
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ SCRIPT CONCLUÍDO" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Arquivos criados:" -ForegroundColor Yellow
Write-Host "  ✓ .env.production (template para produção)" -ForegroundColor Green
Write-Host "  ✓ DIAGNOSTICO_STATUS_PAGAMENTO.md (documentação completa)" -ForegroundColor Green
Write-Host ""

cd ..
