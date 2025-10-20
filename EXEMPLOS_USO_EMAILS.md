# 📚 Exemplos Práticos de Uso do Sistema de Emails

## 🎯 Exemplos de Código

### 1. Enviar Email Manualmente no Django Shell

```python
# Abrir Django shell
python manage.py shell

# Importar o serviço
from cart.email_service import get_email_service
from cart.models import Order

# Obter instância do serviço
email_service = get_email_service()

# Buscar um pedido
order = Order.objects.get(order_number='CHV-2025-001')

# Enviar email de confirmação
email_service.send_order_confirmation(
    order=order,
    customer_email='cliente@example.com',
    customer_name='João Silva'
)

# Enviar email de pagamento aprovado
email_service.send_payment_status_update(
    order=order,
    payment_status='paid',  # ou 'pending', 'failed'
    customer_email='cliente@example.com',
    customer_name='João Silva'
)

# Enviar email de envio
email_service.send_shipping_update(
    order=order,
    tracking_number='CHV12345678',
    customer_email='cliente@example.com',
    customer_name='João Silva'
)
```

### 2. Testar Recuperação de Carrinho

```python
from cart.email_service import get_email_service
from cart.models import Cart
from django.contrib.auth.models import User

email_service = get_email_service()

# Buscar carrinho abandonado
cart = Cart.objects.filter(
    status='abandoned',
    user__isnull=False
).first()

# Gerar URL de recuperação
recovery_url = f"https://chivacomputer.co.mz/carrinho?recovery={cart.recovery_token}"

# Enviar email
email_service.send_cart_recovery_email(
    cart=cart,
    customer_email=cart.user.email,
    customer_name=cart.user.username,
    recovery_url=recovery_url
)
```

### 3. Enviar Notificação para Admin

```python
from cart.email_service import get_email_service
from cart.models import Order

email_service = get_email_service()
order = Order.objects.get(order_number='CHV-2025-001')

# Notificar admin sobre nova venda
email_service.send_new_order_notification_to_admin(order=order)
```

## 🔧 Configurações Avançadas

### Desabilitar Emails Temporariamente

```python
# No Django shell ou view
from django.conf import settings

# Desabilitar todos os emails
settings.EMAIL_NOTIFICATIONS_ENABLED = False

# Desabilitar apenas recuperação de carrinho
settings.SEND_CART_RECOVERY = False

# Reabilitar
settings.EMAIL_NOTIFICATIONS_ENABLED = True
```

### Alterar Email do Admin Dinamicamente

```python
from django.conf import settings

# Mudar email do admin
settings.ADMIN_EMAIL = 'novo_admin@chivacomputer.co.mz'
```

## 🤖 Automatização com Cron

### Linux/Mac - Crontab

```bash
# Editar crontab
crontab -e

# Executar recuperação de carrinhos todo dia às 10h e 18h
0 10,18 * * * cd /var/www/chiva_backend && /usr/bin/python3 manage.py send_cart_recovery_emails >> /var/log/cart_recovery.log 2>&1

# Executar apenas às 10h da manhã
0 10 * * * cd /var/www/chiva_backend && /usr/bin/python3 manage.py send_cart_recovery_emails

# Executar de 2 em 2 horas (das 8h às 20h)
0 8-20/2 * * * cd /var/www/chiva_backend && /usr/bin/python3 manage.py send_cart_recovery_emails
```

### Windows - Task Scheduler

#### PowerShell Script (executar_recuperacao.ps1):
```powershell
# Navegar para pasta do projeto
Set-Location "D:\Projectos\versao_1_chiva\backend"

# Ativar ambiente virtual (se usar)
& "D:\Projectos\versao_1_chiva\venv\Scripts\Activate.ps1"

# Executar comando
python manage.py send_cart_recovery_emails

# Log
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path "D:\Projectos\versao_1_chiva\logs\cart_recovery.log" -Value "$timestamp - Recuperação executada"
```

#### Criar Tarefa Agendada:
1. Abrir **Task Scheduler**
2. **Create Basic Task**
3. Nome: `Chiva Cart Recovery`
4. Trigger: **Daily** at 10:00 AM
5. Action: **Start a program**
   - Program: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "D:\Projectos\versao_1_chiva\executar_recuperacao.ps1"`
6. Finish

### Docker - Adicionar ao docker-compose.yml

```yaml
services:
  # ... outros serviços ...

  cron:
    build: ./backend
    command: >
      sh -c "echo '0 10,18 * * * cd /app && python manage.py send_cart_recovery_emails' | crontab - && crond -f"
    volumes:
      - ./backend:/app
    depends_on:
      - db
    environment:
      - BREVO_API_KEY=${BREVO_API_KEY}
      - ADMIN_EMAIL=${ADMIN_EMAIL}
```

## 📊 Monitoramento e Logs

### Ver Logs de Email no Django

```python
import logging

# Configurar logger
logger = logging.getLogger('cart.email_service')

# Ver últimos logs
for handler in logger.handlers:
    print(handler)
```

### Criar Relatório de Emails Enviados

```python
from cart.models import AbandonedCart
from django.utils import timezone
from datetime import timedelta

# Carrinhos recuperados nos últimos 7 dias
last_week = timezone.now() - timedelta(days=7)
recovered = AbandonedCart.objects.filter(
    recovered=True,
    recovered_at__gte=last_week
).count()

# Emails de recuperação enviados nos últimos 7 dias
emails_sent = AbandonedCart.objects.filter(
    last_recovery_sent__gte=last_week
).count()

print(f"Emails enviados: {emails_sent}")
print(f"Carrinhos recuperados: {recovered}")
print(f"Taxa de recuperação: {(recovered/emails_sent*100):.1f}%")
```

## 🎨 Personalizar Templates

### Exemplo: Adicionar Logo da Empresa

```python
# Em email_service.py, adicione no HTML:

html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif;">
    
    <!-- Logo -->
    <div style="text-align: center; padding: 20px;">
        <img src="https://chivacomputer.co.mz/logo.png" 
             alt="Chiva Computer" 
             style="max-width: 200px;">
    </div>
    
    <!-- Resto do template... -->
    
</body>
</html>
"""
```

### Exemplo: Adicionar Desconto de Recuperação

```python
# Em send_cart_recovery_email():

discount_code = "VOLTA10"  # 10% de desconto

html_content = f"""
<!-- ... -->

<div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px;">
    <h3 style="margin: 0; color: #856404;">🎁 Presente Especial!</h3>
    <p style="margin: 10px 0 0 0;">
        Use o código <strong>{discount_code}</strong> e ganhe 10% de desconto na sua compra!
    </p>
</div>

<!-- ... -->
"""
```

## 🔧 Debug e Troubleshooting

### Verificar se Email Foi Enviado

```python
from cart.email_service import get_email_service

email_service = get_email_service()

# Verificar configuração
print(f"Habilitado: {email_service.enabled}")
print(f"API Key: {email_service.api_key[:20]}...")
print(f"Sender: {email_service.sender_email}")

# Testar envio
result = email_service._send_email(
    to_email='seu_email@example.com',
    to_name='Teste',
    subject='Email de Teste',
    html_content='<h1>Teste</h1><p>Este é um email de teste.</p>'
)

print(f"Resultado: {'✅ Sucesso' if result else '❌ Falha'}")
```

### Ver Detalhes de Erro

```python
import logging

# Configurar logging detalhado
logging.basicConfig(level=logging.DEBUG)

# Tentar enviar email
from cart.email_service import get_email_service
email_service = get_email_service()

# Isso mostrará logs detalhados
email_service._send_email(
    to_email='teste@example.com',
    to_name='Teste',
    subject='Teste',
    html_content='<p>Teste</p>'
)
```

## 📈 Análise de Performance

### Contar Emails por Tipo

```python
from cart.models import Order, AbandonedCart
from django.utils import timezone
from datetime import timedelta

last_month = timezone.now() - timedelta(days=30)

# Pedidos pagos (= emails de confirmação enviados)
confirmations = Order.objects.filter(
    status='paid',
    created_at__gte=last_month
).count()

# Pedidos enviados (= emails de envio)
shipping = Order.objects.filter(
    status='shipped',
    updated_at__gte=last_month
).count()

# Emails de recuperação
recovery = AbandonedCart.objects.filter(
    last_recovery_sent__gte=last_month
).aggregate(total=Sum('recovery_emails_sent'))['total'] or 0

total = confirmations + shipping + recovery
print(f"Total de emails (últimos 30 dias): {total}")
print(f"  Confirmações: {confirmations}")
print(f"  Envios: {shipping}")
print(f"  Recuperação: {recovery}")
```

## 🌐 Integração com Frontend

### Exibir Notificação de Email Enviado

```typescript
// frontend/src/pages/OrderConfirmation.tsx

useEffect(() => {
  if (status === 'paid') {
    toast({
      title: '📧 Email enviado!',
      description: 'Verifique sua caixa de entrada para detalhes do pedido.',
      duration: 5000
    });
  }
}, [status]);
```

### Link de Recuperação de Carrinho

```typescript
// frontend/src/pages/Cart.tsx

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const recoveryToken = params.get('recovery');
  
  if (recoveryToken) {
    // Carregar carrinho usando token
    loadCartFromRecoveryToken(recoveryToken);
    
    toast({
      title: '🛒 Bem-vindo de volta!',
      description: 'Seu carrinho foi restaurado. Finalize sua compra agora!',
      duration: 5000
    });
  }
}, []);
```

## 🎯 Boas Práticas

### 1. Não Enviar Emails em Loop

```python
# ❌ RUIM
for order in Order.objects.all():
    email_service.send_order_confirmation(order, ...)

# ✅ BOM
for order in Order.objects.filter(status='paid', email_sent=False):
    if email_service.send_order_confirmation(order, ...):
        order.email_sent = True
        order.save()
```

### 2. Tratar Erros Gracefully

```python
try:
    email_service.send_order_confirmation(order, email, name)
except Exception as e:
    logger.error(f"Falha ao enviar email: {e}")
    # Continuar processamento sem falhar
```

### 3. Respeitar Limites

```python
# Verificar quantos emails foram enviados hoje
from django.utils import timezone
import redis

r = redis.Redis()
today = timezone.now().strftime('%Y-%m-%d')
key = f'emails_sent:{today}'

count = r.incr(key)
r.expire(key, 86400)  # 24 horas

if count > 250:  # Deixar margem dos 300
    logger.warning("Limite diário de emails próximo!")
```

---

## 📞 Suporte

**Dúvidas sobre os exemplos?**
- Email: suporte@chivacomputer.co.mz
- Documentação: Ver `SISTEMA_NOTIFICACOES_EMAIL.md`
- Brevo Docs: https://developers.brevo.com
