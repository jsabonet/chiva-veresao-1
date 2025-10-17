# Script PowerShell para Testar Status de Pedidos
# Uso: .\test_order_status.ps1

# Configuração
$TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMjEzMGZlZjAyNTg3ZmQ4ODYxODg2OTgyMjczNGVmNzZhMTExNjUiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoic2Fib29uZXQgeCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJNzlzZVNudjJRbWhzTDBlZGluNmZRdlNGbHg4YS1JVjh5UFFGTUJ0clZaOXI3enc9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY2hpdmEtY29tcHV0ZXIiLCJhdWQiOiJjaGl2YS1jb21wdXRlciIsImF1dGhfdGltZSI6MTc2MDcyMzQwMSwidXNlcl9pZCI6IjduUE82c1FhczVod0pKU2NkU3J5ODFLejM2RTIiLCJzdWIiOiI3blBPNnNRYXM1aHdKSlNjZFNyeTgxS3ozNkUyIiwiaWF0IjoxNzYwNzIzNzk1LCJleHAiOjE3NjA3MjczOTUsImVtYWlsIjoianNhYm9uZXRlMDlAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTU3OTU2NzIyOTY4NzI0NTk2NDciXSwiZW1haWwiOlsianNhYm9uZXRlMDlAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.gEWDgSB8tAvGs8Ay07p_yenx0kcVWDgOxkfauxlbJQ7Am8BfGWUW8SJkNkG9-s3MX6-qWs8P3ZLMMnkUb9BQLqdPNeTyd971X5tDNRe10d6xcS12hG_8bT2RsImKp1rOmO2igZ8ph0vb-O2kvELz-BBjsPeL2TYFvWpY2bmrVZubSi01jsV41FsW3kHPEAJCBT_v7jo3lfvsemt3qinx-sO1p1Fb8Cv_ohr_hgBYQN56UxRf06DLyaOPgVatudTOSA83nmV3mb5dZjkvM4Fnkp89ZZSC94gbHIrArrkWqdqYUZSC7Rf9_xYjBxV95BXAInvPi_6gjCr3BoSJRcDvaQ"
$BASE_URL = "https://chivacomputer.co.mz/api/cart/payments/status"

# Função para obter status de um pedido
function Get-OrderStatus {
    param (
        [int]$OrderId
    )
    
    try {
        Write-Host "`n📦 Consultando pedido #$OrderId..." -ForegroundColor Cyan
        
        $response = Invoke-RestMethod `
            -Uri "$BASE_URL/$OrderId/" `
            -Headers @{ Authorization = "Bearer $TOKEN" } `
            -Method Get
        
        $order = $response.order
        $payment = $response.payments[0]
        
        # Cor baseada no status
        $statusColor = switch ($order.status) {
            "paid" { "Green" }
            "failed" { "Red" }
            "cancelled" { "Yellow" }
            default { "Blue" }
        }
        
        Write-Host "`n  OK Pedido: $($order.order_number)" -ForegroundColor White
        Write-Host "  Status Order: $($order.status)" -ForegroundColor $statusColor
        Write-Host "  Status Payment: $($payment.status)" -ForegroundColor $statusColor
        Write-Host "  Metodo: $($payment.method.ToUpper())"
        Write-Host "  Valor: $($order.total_amount) MZN"
        Write-Host "  Referencia: $($payment.paysuite_reference)"
        Write-Host "  Criado: $($order.created_at)"
        
        if ($payment.raw_response.data.checkout_url) {
            Write-Host "  Checkout URL: $($payment.raw_response.data.checkout_url)" -ForegroundColor Gray
        }
        
        if ($payment.raw_response.event) {
            Write-Host "  Evento Webhook: $($payment.raw_response.event)" -ForegroundColor Magenta
        }
        
        return $response
    }
    catch {
        Write-Host "  X Erro ao consultar pedido #$OrderId" -ForegroundColor Red
        Write-Host "  Detalhes: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Função para listar múltiplos pedidos
function Get-MultipleOrders {
    param (
        [int[]]$OrderIds
    )
    
    Write-Host "`n╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║      CONSULTA DE STATUS DE PEDIDOS - CHIVA          ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    $results = @()
    foreach ($orderId in $OrderIds) {
        $result = Get-OrderStatus -OrderId $orderId
        if ($result) {
            $results += $result
        }
        Start-Sleep -Milliseconds 500
    }
    
    # Resumo
    Write-Host "`n╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                     RESUMO                           ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    $paid = ($results | Where-Object { $_.order.status -eq "paid" }).Count
    $pending = ($results | Where-Object { $_.order.status -eq "pending" }).Count
    $failed = ($results | Where-Object { $_.order.status -eq "failed" }).Count
    
    Write-Host "`n  OK Pagos: $paid" -ForegroundColor Green
    Write-Host "  ... Pendentes: $pending" -ForegroundColor Blue
    Write-Host "  X Falhos: $failed" -ForegroundColor Red
    Write-Host ""
}

# Executar consulta para os pedidos de teste
Get-MultipleOrders -OrderIds @(10, 11, 12, 13)

# Instrucoes adicionais
Write-Host "`nDICAS:" -ForegroundColor Yellow
Write-Host "  * Para testar outros pedidos: Get-OrderStatus -OrderId 14" -ForegroundColor Gray
Write-Host "  * Para multiplos: Get-MultipleOrders -OrderIds @(12,13,14)" -ForegroundColor Gray
Write-Host "  * Token expira em 1 hora - atualize se necessario" -ForegroundColor Gray
Write-Host ""
