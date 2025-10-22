# Script para reiniciar completamente o servidor Django
# Execute este script para garantir que o servidor carregue as novas rotas

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "REINICIAR SERVIDOR DJANGO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Parar todos os processos Python
Write-Host "[1/3] Parando processos Python..." -ForegroundColor Yellow
$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    $pythonProcesses | Stop-Process -Force
    Write-Host "   ✓ $($pythonProcesses.Count) processo(s) Python parado(s)" -ForegroundColor Green
} else {
    Write-Host "   ℹ Nenhum processo Python encontrado" -ForegroundColor Gray
}
Start-Sleep -Seconds 2

# 2. Navegar para backend
Write-Host ""
Write-Host "[2/3] Navegando para backend..." -ForegroundColor Yellow
Set-Location "D:\Projectos\versao_1_chiva\backend"
Write-Host "   ✓ Pasta: $(Get-Location)" -ForegroundColor Green

# 3. Iniciar servidor
Write-Host ""
Write-Host "[3/3] Iniciando servidor Django..." -ForegroundColor Yellow
Write-Host "   ⚠ Pressione CTRL+C para parar" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
python manage.py runserver
