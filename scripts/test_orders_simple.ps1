# Test Order Status - Simple Version
# Usage: .\test_orders_simple.ps1

$TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMjEzMGZlZjAyNTg3ZmQ4ODYxODg2OTgyMjczNGVmNzZhMTExNjUiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoic2Fib29uZXQgeCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJNzlzZVNudjJRbWhzTDBlZGluNmZRdlNGbHg4YS1JVjh5UFFGTUJ0clZaOXI3enc9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY2hpdmEtY29tcHV0ZXIiLCJhdWQiOiJjaGl2YS1jb21wdXRlciIsImF1dGhfdGltZSI6MTc2MDcyMzQwMSwidXNlcl9pZCI6IjduUE82c1FhczVod0pKU2NkU3J5ODFLejM2RTIiLCJzdWIiOiI3blBPNnNRYXM1aHdKSlNjZFNyeTgxS3ozNkUyIiwiaWF0IjoxNzYwNzIzNzk1LCJleHAiOjE3NjA3MjczOTUsImVtYWlsIjoianNhYm9uZXRlMDlAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTU3OTU2NzIyOTY4NzI0NTk2NDciXSwiZW1haWwiOlsianNhYm9uZXRlMDlAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.gEWDgSB8tAvGs8Ay07p_yenx0kcVWDgOxkfauxlbJQ7Am8BfGWUW8SJkNkG9-s3MX6-qWs8P3ZLMMnkUb9BQLqdPNeTyd971X5tDNRe10d6xcS12hG_8bT2RsImKp1rOmO2igZ8ph0vb-O2kvELz-BBjsPeL2TYFvWpY2bmrVZubSi01jsV41FsW3kHPEAJCBT_v7jo3lfvsemt3qinx-sO1p1Fb8Cv_ohr_hgBYQN56UxRf06DLyaOPgVatudTOSA83nmV3mb5dZjkvM4Fnkp89ZZSC94gbHIrArrkWqdqYUZSC7Rf9_xYjBxV95BXAInvPi_6gjCr3BoSJRcDvaQ"

Write-Host "`n=== TESTE DE STATUS DE PEDIDOS ===" -ForegroundColor Cyan
Write-Host ""

$orders = @(10, 11, 12, 13)

foreach ($id in $orders) {
    Write-Host "Pedido #$id" -ForegroundColor White -NoNewline
    try {
        $result = Invoke-RestMethod `
            -Uri "https://chivacomputer.co.mz/api/cart/payments/status/$id/" `
            -Headers @{ Authorization = "Bearer $TOKEN" } `
            -Method Get
        
        $status = $result.order.status
        $paymentStatus = $result.payments[0].status
        $method = $result.payments[0].method
        $ref = $result.payments[0].paysuite_reference
        
        $color = "Blue"
        if ($status -eq "paid") { $color = "Green" }
        if ($status -eq "failed") { $color = "Red" }
        
        Write-Host " - $status " -ForegroundColor $color -NoNewline
        Write-Host "($method) - $ref"
    }
    catch {
        Write-Host " - ERROR" -ForegroundColor Red
    }
}

Write-Host ""
