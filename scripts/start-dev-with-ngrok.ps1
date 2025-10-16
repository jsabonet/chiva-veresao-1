# ================================================================
# Script: Iniciar Desenvolvimento com ngrok
# Descrição: Inicia ngrok, captura URL, e configura Django
# ================================================================

Write-Host ""
Write-Host "🚀 Chiva Computer - Dev Environment com ngrok" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se ngrok está instalado
try {
    $ngrokVersion = ngrok version
    Write-Host "✅ ngrok instalado: $ngrokVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ngrok não encontrado!" -ForegroundColor Red
    Write-Host "Instale com: winget install ngrok.ngrok" -ForegroundColor Yellow
    exit 1
}

# Verificar se Django está no PATH
try {
    $pythonVersion = python --version
    Write-Host "✅ Python instalado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python não encontrado!" -ForegroundColor Red
    exit 1
}

# Navegar para diretório do projeto
$projectRoot = "D:\Projectos\versao_1_chiva"
if (-not (Test-Path $projectRoot)) {
    Write-Host "❌ Diretório do projeto não encontrado: $projectRoot" -ForegroundColor Red
    exit 1
}

Set-Location $projectRoot
Write-Host "✅ Diretório: $projectRoot" -ForegroundColor Green
Write-Host ""

# Parar ngrok anterior (se houver)
Write-Host "🧹 Limpando processos anteriores..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "ngrok"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Iniciar ngrok em nova janela
Write-Host "🌐 Iniciando ngrok..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $projectRoot; ngrok http 8000" -WindowStyle Normal

# Aguardar ngrok inicializar
Write-Host "⏳ Aguardando ngrok iniciar (5 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Tentar obter URL do ngrok via API
Write-Host "🔍 Obtendo URL pública do ngrok..." -ForegroundColor Cyan
$maxAttempts = 5
$attempt = 0
$ngrokUrl = $null

while ($attempt -lt $maxAttempts -and -not $ngrokUrl) {
    try {
        $tunnels = Invoke-RestMethod http://localhost:4040/api/tunnels -ErrorAction Stop
        $ngrokUrl = $tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1 -ExpandProperty public_url
        
        if ($ngrokUrl) {
            Write-Host "✅ ngrok URL: $ngrokUrl" -ForegroundColor Green
            break
        }
    } catch {
        $attempt++
        if ($attempt -lt $maxAttempts) {
            Write-Host "   Tentativa $attempt/$maxAttempts falhou, aguardando..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $ngrokUrl) {
    Write-Host "❌ Não foi possível obter URL do ngrok" -ForegroundColor Red
    Write-Host "Verifique se ngrok está rodando e tente novamente" -ForegroundColor Yellow
    Write-Host "Dashboard ngrok: http://localhost:4040" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ngrok URL Configurada" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "  $ngrokUrl" -ForegroundColor White
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Configurar variável de ambiente
$env:WEBHOOK_BASE_URL = $ngrokUrl
Write-Host "✅ WEBHOOK_BASE_URL=$ngrokUrl" -ForegroundColor Green
Write-Host ""

# Opcionalmente atualizar .env (para persistir)
$envFile = Join-Path $projectRoot "backend\.env"
if (Test-Path $envFile) {
    $choice = Read-Host "Atualizar WEBHOOK_BASE_URL em backend\.env? (s/N)"
    if ($choice -eq "s" -or $choice -eq "S") {
        $envContent = Get-Content $envFile -Raw
        if ($envContent -match "WEBHOOK_BASE_URL=.*") {
            $envContent = $envContent -replace "WEBHOOK_BASE_URL=.*", "WEBHOOK_BASE_URL=$ngrokUrl"
        } else {
            $envContent += "`nWEBHOOK_BASE_URL=$ngrokUrl`n"
        }
        Set-Content -Path $envFile -Value $envContent
        Write-Host "✅ Arquivo .env atualizado" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Abrir outro terminal para frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "   2. Abrir dashboard ngrok: http://localhost:4040" -ForegroundColor White
Write-Host "   3. Fazer compra teste no frontend" -ForegroundColor White
Write-Host "   4. Ver webhooks no dashboard ngrok e logs Django abaixo" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Iniciando Django em 3 segundos..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Navegar para backend e iniciar Django
Set-Location (Join-Path $projectRoot "backend")
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Django Development Server" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

python manage.py runserver 8000
