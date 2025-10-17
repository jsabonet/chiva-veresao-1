 Setup Rápido: Testar Webhooks em Desenvolvimento Local

## 🎯 Objetivo

Configurar ngrok para receber webhooks do Paysuite em desenvolvimento local.

---

## 📦 Passo 1: Instalar ngrok

### Opção A: Via winget (Recomendado)
```powershell
winget install ngrok.ngrok
```

### Opção B: Via Chocolatey
```powershell
choco install ngrok
```

### Opção C: Download Manual
1. Baixar de: https://ngrok.com/download
2. Extrair para uma pasta (ex: `C:\ngrok\`)
3. Adicionar ao PATH do Windows

---

## 🔑 Passo 2: Criar Conta e Configurar Token

1. Criar conta gratuita em: https://dashboard.ngrok.com/signup
2. Copiar authtoken do dashboard: https://dashboard.ngrok.com/get-started/your-authtoken
3. Configurar:

```powershell
ngrok config add-authtoken SEU_TOKEN_AQUI
```

---

## 🚀 Passo 3: Expor Backend Django

### Terminal 1: Iniciar Django
```powershell
cd D:\Projectos\versao_1_chiva\backend
python manage.py runserver 8000
```

### Terminal 2: Iniciar ngrok
```powershell
ngrok http 8000
```

Você verá algo como:
```
ngrok                                                                           

Session Status                online
Account                       Seu Nome (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:8000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copie a URL do Forwarding**: `https://abc123.ngrok-free.app`

---

## ⚙️ Passo 4: Configurar Variável de Ambiente

### Opção A: Temporária (somente sessão atual)

```powershell
# No terminal onde vai rodar Django
$env:WEBHOOK_BASE_URL="https://abc123.ngrok-free.app"
python manage.py runserver 8000
```

### Opção B: Permanente (arquivo .env)

Editar `backend/.env`:
```env
WEBHOOK_BASE_URL=https://abc123.ngrok-free.app
```

**⚠️ IMPORTANTE**: Atualizar toda vez que reiniciar ngrok (URL muda)

### Opção C: URL fixa do ngrok (Plano pago)

Com plano pago do ngrok, pode ter domínio fixo:
```powershell
ngrok http 8000 --domain=seu-dominio.ngrok-free.app
```

---

## ✅ Passo 5: Verificar Configuração

### Teste 1: Verificar URL acessível

Abrir no browser: `https://abc123.ngrok-free.app/admin`

Deve carregar a página de admin do Django.

### Teste 2: Verificar webhook endpoint

```powershell
curl -X POST https://abc123.ngrok-free.app/api/cart/payments/webhook/ `
  -H "Content-Type: application/json" `
  -d '{}'
```

Resposta esperada: `400 Bad Request` ou `405 Method Not Allowed` (é normal - endpoint precisa de dados válidos)

**Se retornar 404**: Endpoint não existe ou ngrok não está redirecionando corretamente

### Teste 3: Verificar logs do Django

No terminal do Django, deve ver:
```
🔔 Using configured WEBHOOK_BASE_URL: https://abc123.ngrok-free.app
```

---

## 🧪 Passo 6: Testar Fluxo Completo

### 1. Iniciar todos os serviços

**Terminal 1 - Django:**
```powershell
cd backend
$env:WEBHOOK_BASE_URL="https://abc123.ngrok-free.app"
python manage.py runserver 8000
```

**Terminal 2 - ngrok:**
```powershell
ngrok http 8000
```

**Terminal 3 - Frontend:**
```powershell
cd frontend
npm run dev
```

### 2. Fazer compra teste

1. Abrir frontend: http://localhost:5173
2. Adicionar produtos ao carrinho
3. Ir para checkout
4. Selecionar método de pagamento (M-Pesa ou e-mola)
5. Preencher dados de envio
6. Clicar em "Finalizar Pedido"

### 3. Verificar logs do Django

Deve aparecer:
```
🔔 Using configured WEBHOOK_BASE_URL: https://abc123.ngrok-free.app
💳 Initiating payment: {method: 'mpesa', amount: 468.00}
✅ Payment initiated: payment_id=144, order_id=143
```

### 4. Pagar no Paysuite

1. Será redirecionado para página do Paysuite
2. Fazer pagamento teste (M-Pesa ou e-mola)
3. Paysuite enviará webhook para: `https://abc123.ngrok-free.app/api/cart/payments/webhook/`

### 5. Verificar webhook recebido

**Logs do Django devem mostrar:**
```
🔔 Webhook received from IP: xxx.xxx.xxx.xxx
📦 Webhook payload: {'event': 'payment.success', 'reference': 'PAY000144', ...}
🔔 Webhook received: event=payment.success, payment_id=144, status: pending → paid
📦 Order ORD-000143 (id=143) status updated: pending → paid
```

**Logs do Frontend (Console do browser):**
```
📊 Poll Response: {order_id: 143, order_status: 'paid', payments: [{...}], timestamp: '23:15:30'}
```

### 6. Verificar UI atualizada

OrderConfirmation deve mostrar:
- ✅ Borda verde
- ✅ Ícone checkmark verde grande
- ✅ Mensagem "Pagamento Aprovado!"
- ✅ Botões "Ver pedido" e "Continuar comprando"

---

## 🔍 Monitorar Requisições no ngrok

Abrir dashboard do ngrok em: http://127.0.0.1:4040

Lá você pode ver:
- Todas as requisições HTTP recebidas
- Headers completos
- Payload do webhook
- Resposta enviada pelo Django
- Útil para debug!

---

## ❌ Troubleshooting

### Problema: ngrok não funciona

**Solução:**
```powershell
# Verificar se instalou corretamente
ngrok version

# Se não reconhecer, adicionar ao PATH manualmente
$env:PATH += ";C:\caminho\para\ngrok"
```

### Problema: Django retorna 404 via ngrok

**Causas possíveis:**
1. ALLOWED_HOSTS não inclui domínio do ngrok

**Solução em settings.py:**
```python
ALLOWED_HOSTS = ['*']  # Temporário para teste
```

Ou adicionar domínio específico:
```python
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'abc123.ngrok-free.app']
```

### Problema: URL do ngrok muda sempre

**Soluções:**
1. Usar plano pago do ngrok (domínio fixo)
2. Criar script PowerShell para automatizar:

```powershell
# start-dev.ps1
# Iniciar ngrok e capturar URL
Start-Process powershell -ArgumentList "ngrok http 8000" -WindowStyle Normal

# Aguardar ngrok iniciar
Start-Sleep -Seconds 3

# Obter URL via API do ngrok
$ngrokUrl = (Invoke-RestMethod http://localhost:4040/api/tunnels).tunnels[0].public_url

# Configurar variável de ambiente
$env:WEBHOOK_BASE_URL = $ngrokUrl

# Informar URL
Write-Host "✅ ngrok URL: $ngrokUrl" -ForegroundColor Green
Write-Host "Configure no Paysuite (se necessário)" -ForegroundColor Yellow

# Iniciar Django
python manage.py runserver 8000
```

### Problema: Webhook nunca chega

**Checklist:**
- [ ] ngrok está rodando?
- [ ] Django está rodando?
- [ ] WEBHOOK_BASE_URL está configurado corretamente?
- [ ] ALLOWED_HOSTS permite domínio do ngrok?
- [ ] Firewall não está bloqueando?
- [ ] Testar endpoint manualmente com curl funciona?

---

## 📚 Recursos

- **ngrok Dashboard**: http://127.0.0.1:4040
- **ngrok Documentation**: https://ngrok.com/docs
- **Django Logs**: Terminal onde Django está rodando
- **Frontend Logs**: Console do browser (F12)

---

## 🎓 Dica Pro

### Script All-in-One (start-dev-with-ngrok.ps1)

```powershell
# Criar arquivo: scripts/start-dev-with-ngrok.ps1

# Parar processos anteriores
Get-Process | Where-Object {$_.ProcessName -like "*python*" -or $_.ProcessName -like "*ngrok*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Iniciar ngrok em background
Start-Process powershell -ArgumentList "cd D:\Projectos\versao_1_chiva; ngrok http 8000" -WindowStyle Normal

Write-Host "⏳ Aguardando ngrok iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Obter URL do ngrok
try {
    $ngrokUrl = (Invoke-RestMethod http://localhost:4040/api/tunnels).tunnels[0].public_url
    Write-Host "✅ ngrok URL: $ngrokUrl" -ForegroundColor Green
    
    # Configurar e iniciar Django
    cd backend
    $env:WEBHOOK_BASE_URL = $ngrokUrl
    Write-Host "✅ WEBHOOK_BASE_URL configurado" -ForegroundColor Green
    Write-Host "🚀 Iniciando Django..." -ForegroundColor Cyan
    python manage.py runserver 8000
} catch {
    Write-Host "❌ Erro ao obter URL do ngrok" -ForegroundColor Red
    Write-Host "Inicie manualmente: ngrok http 8000" -ForegroundColor Yellow
}
```

**Uso:**
```powershell
.\scripts\start-dev-with-ngrok.ps1
```

---

## ✅ Resumo

1. **Instalar ngrok**: `winget install ngrok.ngrok`
2. **Configurar token**: `ngrok config add-authtoken TOKEN`
3. **Iniciar ngrok**: `ngrok http 8000`
4. **Copiar URL**: ex: `https://abc123.ngrok-free.app`
5. **Configurar .env**: `WEBHOOK_BASE_URL=https://abc123.ngrok-free.app`
6. **Iniciar Django**: `python manage.py runserver 8000`
7. **Testar compra**: Frontend → Checkout → Pagamento
8. **Verificar logs**: Webhook deve aparecer no terminal Django

Pronto! Agora webhooks funcionam em desenvolvimento local! 🎉
