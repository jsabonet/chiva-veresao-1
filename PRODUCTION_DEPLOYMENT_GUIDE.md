# Guia de Produção: Sistema de Pagamentos Paysuite

## 🎯 Objetivo

Garantir que webhooks do Paysuite funcionem corretamente em produção, permitindo que OrderConfirmation reflita status em tempo real.

---

## 📋 Checklist de Produção

### ✅ 1. Infraestrutura Necessária

- [ ] Servidor com IP público ou domínio (Railway, Render, Heroku, VPS, etc.)
- [ ] SSL/HTTPS configurado (obrigatório para webhooks)
- [ ] Backend acessível publicamente
- [ ] Variáveis de ambiente configuradas
- [ ] Logs configurados para monitoramento

### ✅ 2. Configuração de Webhook URL

- [ ] Webhook URL usa HTTPS (não HTTP)
- [ ] URL é acessível externamente (teste com curl/Postman)
- [ ] Endpoint não requer autenticação para Paysuite
- [ ] URL está configurada no painel Paysuite (se aplicável)

### ✅ 3. Segurança

- [ ] Validação de webhook implementada
- [ ] IP whitelist configurado (se Paysuite fornecer IPs)
- [ ] Rate limiting no endpoint de webhook
- [ ] Logs de tentativas de webhook maliciosos

### ✅ 4. Monitoramento

- [ ] Logs estruturados (JSON)
- [ ] Alertas para webhooks falhados
- [ ] Métricas de sucesso/falha
- [ ] Dashboard de pagamentos

---

## 🔧 Implementação Passo a Passo

### Passo 1: Configurar Variável de Ambiente

#### A. Adicionar em `backend/chiva_backend/settings.py`

```python
# ==========================================
# WEBHOOK CONFIGURATION
# ==========================================

# Base URL for webhook callbacks (MUST be publicly accessible)
WEBHOOK_BASE_URL = os.environ.get(
    'WEBHOOK_BASE_URL',
    'http://127.0.0.1:8000'  # Default for development
)

# Validate webhook URL in production
if not DEBUG and WEBHOOK_BASE_URL.startswith('http://127.0.0.1'):
    import warnings
    warnings.warn(
        "⚠️ WEBHOOK_BASE_URL is using localhost in production! "
        "Webhooks will not work. Set WEBHOOK_BASE_URL environment variable."
    )

# Optional: Paysuite webhook secret for validation
PAYSUITE_WEBHOOK_SECRET = os.environ.get('PAYSUITE_WEBHOOK_SECRET', '')
```

#### B. Atualizar `backend/cart/views.py`

```python
from django.conf import settings

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    """
    Initiate a payment with external gateway (Paysuite)
    """
    # ... código existente ...
    
    # Construct webhook URL using environment variable
    webhook_url = f"{settings.WEBHOOK_BASE_URL}/api/cart/payments/webhook/"
    
    # Log webhook URL for debugging
    logger.info(f"🔔 Webhook URL configured: {webhook_url}")
    
    # ... resto do código ...
```

### Passo 2: Adicionar Validação de Webhook (Segurança)

#### A. Criar função de validação

```python
import hashlib
import hmac
from django.conf import settings

def validate_paysuite_webhook(request):
    """
    Validate webhook signature to ensure it's from Paysuite
    
    Returns:
        bool: True if valid, False otherwise
    """
    # Se não houver secret configurado, pular validação (dev only)
    if not settings.PAYSUITE_WEBHOOK_SECRET:
        logger.warning("⚠️ Webhook validation skipped - no secret configured")
        return True
    
    # Obter signature do header
    signature = request.headers.get('X-Paysuite-Signature', '')
    if not signature:
        logger.error("❌ Webhook rejected: Missing signature")
        return False
    
    # Calcular hash esperado
    payload = request.body
    expected_signature = hmac.new(
        settings.PAYSUITE_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    # Comparação segura
    is_valid = hmac.compare_digest(signature, expected_signature)
    
    if not is_valid:
        logger.error(f"❌ Webhook rejected: Invalid signature")
    
    return is_valid
```

#### B. Atualizar webhook handler

```python
@api_view(['POST'])
@permission_classes([AllowAny])  # Webhook vem de servidor externo
@csrf_exempt  # Webhook não tem CSRF token
def paysuite_webhook(request):
    """
    Handle webhook notifications from Paysuite
    """
    # Validar webhook
    if not validate_paysuite_webhook(request):
        return Response(
            {'error': 'Invalid webhook signature'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Log raw webhook data
    logger.info(f"🔔 Webhook received from IP: {request.META.get('REMOTE_ADDR')}")
    logger.info(f"📦 Webhook payload: {request.data}")
    
    # ... resto do código existente ...
```

### Passo 3: Melhorar Logs para Produção

#### A. Configurar logging estruturado em `settings.py`

```python
# ==========================================
# LOGGING CONFIGURATION
# ==========================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose' if DEBUG else 'json',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'webhook.log'),
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
            'formatter': 'json',
        },
    },
    'loggers': {
        'cart.views': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'cart.payments': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

#### B. Instalar dependências de logging

```bash
pip install python-json-logger
```

Adicionar em `requirements.txt`:
```
python-json-logger==2.0.7
```

### Passo 4: Adicionar Retry Mechanism

#### A. Criar sistema de retry para webhooks falhados

```python
from django.utils import timezone
from datetime import timedelta

class WebhookEvent(models.Model):
    """
    Track webhook events for debugging and retry
    """
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='webhook_events')
    event_type = models.CharField(max_length=50)
    raw_payload = models.JSONField()
    processed = models.BooleanField(default=False)
    processing_attempts = models.IntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['processed', 'processing_attempts']),
        ]

def process_webhook_with_retry(webhook_data):
    """
    Process webhook with automatic retry on failure
    """
    event = WebhookEvent.objects.create(
        payment_id=webhook_data.get('payment_id'),
        event_type=webhook_data.get('event'),
        raw_payload=webhook_data,
        last_attempt_at=timezone.now()
    )
    
    try:
        # Processar webhook
        payment = Payment.objects.get(paysuite_reference=webhook_data.get('reference'))
        # ... lógica de atualização ...
        
        event.processed = True
        event.save()
        logger.info(f"✅ Webhook processed successfully: {event.id}")
        
    except Exception as e:
        event.processing_attempts += 1
        event.error_message = str(e)
        event.save()
        
        logger.error(f"❌ Webhook processing failed (attempt {event.processing_attempts}): {e}")
        
        # Agendar retry se não excedeu limite
        if event.processing_attempts < 5:
            # Usar Celery, RQ, ou similar para retry assíncrono
            retry_webhook.apply_async(args=[event.id], countdown=60 * event.processing_attempts)
```

### Passo 5: Criar Management Command para Processar Webhooks Pendentes

```python
# backend/cart/management/commands/retry_webhooks.py

from django.core.management.base import BaseCommand
from cart.models import WebhookEvent
from cart.views import process_webhook_with_retry

class Command(BaseCommand):
    help = 'Retry failed webhook processing'

    def handle(self, *args, **options):
        pending_webhooks = WebhookEvent.objects.filter(
            processed=False,
            processing_attempts__lt=5
        ).order_by('created_at')
        
        self.stdout.write(f"Found {pending_webhooks.count()} pending webhooks")
        
        for webhook in pending_webhooks:
            self.stdout.write(f"Processing webhook {webhook.id}...")
            try:
                process_webhook_with_retry(webhook.raw_payload)
                self.stdout.write(self.style.SUCCESS(f"✅ Webhook {webhook.id} processed"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Webhook {webhook.id} failed: {e}"))
```

Executar manualmente ou via cron:
```bash
python manage.py retry_webhooks
```

---

## 🚀 Deploy em Diferentes Plataformas

### Railway

#### 1. Configurar variáveis de ambiente

```bash
# No dashboard Railway ou via CLI
railway variables set WEBHOOK_BASE_URL=https://seu-app.railway.app
railway variables set PAYSUITE_WEBHOOK_SECRET=seu_secret_aqui
```

#### 2. Deploy

```bash
railway up
```

#### 3. Verificar webhook URL

```bash
curl https://seu-app.railway.app/api/cart/payments/webhook/
# Deve retornar 405 Method Not Allowed (é esperado - só aceita POST)
```

### Render

#### 1. Adicionar variáveis no dashboard

```
WEBHOOK_BASE_URL=https://seu-app.onrender.com
PAYSUITE_WEBHOOK_SECRET=seu_secret_aqui
```

#### 2. Deploy automático via Git

Push para branch configurado no Render.

### VPS (Ubuntu/Debian)

#### 1. Configurar variáveis no systemd

```bash
# /etc/systemd/system/chiva-backend.service

[Service]
Environment="WEBHOOK_BASE_URL=https://api.chiva.co.mz"
Environment="PAYSUITE_WEBHOOK_SECRET=seu_secret_aqui"
```

#### 2. Nginx como reverse proxy

```nginx
# /etc/nginx/sites-available/chiva

server {
    listen 443 ssl http2;
    server_name api.chiva.co.mz;

    ssl_certificate /etc/letsencrypt/live/api.chiva.co.mz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.chiva.co.mz/privkey.pem;

    location /api/cart/payments/webhook/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔍 Testes em Produção

### Teste 1: Verificar Webhook URL Acessível

```bash
# Substituir pela sua URL de produção
curl -X POST https://seu-app.railway.app/api/cart/payments/webhook/ \
  -H "Content-Type: application/json" \
  -d '{}'

# Resposta esperada: 400 Bad Request (é esperado - webhook precisa de dados válidos)
# Se retornar 404 ou timeout, há problema de configuração
```

### Teste 2: Verificar Logs

```bash
# Railway
railway logs

# Render
# Ver logs no dashboard

# VPS
tail -f /var/log/chiva/webhook.log
```

### Teste 3: Simular Webhook Completo

```bash
# Obter token de teste do Paysuite
# Fazer compra teste
# Verificar logs para confirmar:

# ✅ "🔔 Webhook received from IP: xxx.xxx.xxx.xxx"
# ✅ "📦 Order ORD-000xxx status updated: pending → paid"
# ✅ "✅ Returning status: order.status=paid"
```

### Teste 4: Verificar Polling Frontend

1. Abrir OrderConfirmation em produção
2. Abrir DevTools Console
3. Ver logs: `📊 Poll Response: {order_status: 'paid', ...}`
4. Confirmar UI atualiza dentro de 3 segundos após webhook

---

## 📊 Monitoramento Recomendado

### Métricas Essenciais

```python
# Adicionar em views.py ou criar dashboard admin

def webhook_metrics(request):
    """Admin endpoint para métricas de webhook"""
    from django.db.models import Count, Q
    from datetime import timedelta
    
    last_24h = timezone.now() - timedelta(hours=24)
    
    metrics = {
        'total_webhooks_24h': WebhookEvent.objects.filter(
            created_at__gte=last_24h
        ).count(),
        'successful_24h': WebhookEvent.objects.filter(
            created_at__gte=last_24h,
            processed=True
        ).count(),
        'failed_24h': WebhookEvent.objects.filter(
            created_at__gte=last_24h,
            processed=False
        ).count(),
        'pending_orders': Order.objects.filter(status='pending').count(),
        'paid_orders_24h': Order.objects.filter(
            status='paid',
            updated_at__gte=last_24h
        ).count(),
    }
    
    return JsonResponse(metrics)
```

### Alertas (usando Sentry, LogDNA, etc.)

```python
import sentry_sdk

# Em settings.py
sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    environment='production',
    traces_sample_rate=1.0,
)

# Em views.py - webhook handler
try:
    # processar webhook
    pass
except Exception as e:
    sentry_sdk.capture_exception(e)
    logger.error(f"❌ Webhook processing failed: {e}", exc_info=True)
```

---

## 🛡️ Segurança em Produção

### 1. Rate Limiting

```python
# Usando django-ratelimit
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='100/h', method='POST')
@api_view(['POST'])
def paysuite_webhook(request):
    # ... código ...
    pass
```

### 2. IP Whitelist (se Paysuite fornecer)

```python
PAYSUITE_ALLOWED_IPS = os.environ.get('PAYSUITE_ALLOWED_IPS', '').split(',')

def paysuite_webhook(request):
    client_ip = request.META.get('REMOTE_ADDR')
    
    if PAYSUITE_ALLOWED_IPS and client_ip not in PAYSUITE_ALLOWED_IPS:
        logger.warning(f"⚠️ Webhook from unauthorized IP: {client_ip}")
        return Response({'error': 'Unauthorized'}, status=403)
    
    # ... processar webhook ...
```

### 3. HTTPS Obrigatório

```python
# settings.py
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

---

## 📝 Checklist Final Antes de Produção

### Backend
- [ ] `WEBHOOK_BASE_URL` configurado com URL pública HTTPS
- [ ] `PAYSUITE_WEBHOOK_SECRET` configurado (se disponível)
- [ ] Validação de webhook implementada
- [ ] Logs estruturados configurados
- [ ] Rate limiting ativo
- [ ] SSL/HTTPS configurado
- [ ] Variáveis de ambiente em `.env` (não commitadas no Git)

### Frontend
- [ ] `API_BASE_URL` aponta para backend de produção
- [ ] Polling configurado (3s interval, 2min timeout)
- [ ] Mensagens de erro/sucesso testadas
- [ ] Build de produção otimizado (`npm run build`)

### Infraestrutura
- [ ] Domínio configurado com DNS
- [ ] Certificado SSL válido
- [ ] Firewall configurado (porta 443 aberta)
- [ ] Backup de banco de dados configurado
- [ ] Monitoramento ativo (Sentry, Datadog, etc.)

### Paysuite
- [ ] Webhook URL cadastrada no painel (se aplicável)
- [ ] Credenciais de produção (não sandbox)
- [ ] Teste de pagamento real realizado
- [ ] Documentação de webhook consultada

---

## 🆘 Troubleshooting em Produção

### Webhook não está chegando

1. **Verificar URL acessível:**
   ```bash
   curl -I https://seu-app.com/api/cart/payments/webhook/
   # Deve retornar 405 ou 401, NÃO 404 ou timeout
   ```

2. **Ver logs do servidor:**
   ```bash
   railway logs --tail  # ou equivalente na sua plataforma
   ```

3. **Verificar firewall/proxy:**
   - Certifique-se que porta 443 está aberta
   - Nginx/Apache está passando requisições para Django

4. **Testar manualmente:**
   ```bash
   curl -X POST https://seu-app.com/api/cart/payments/webhook/ \
     -H "Content-Type: application/json" \
     -d '{"event":"payment.success","reference":"test-123"}'
   ```

### Status não atualiza no frontend

1. **Verificar polling nos logs do browser:**
   - Deve ver: `📊 Poll Response: {...}` a cada 3 segundos

2. **Verificar resposta da API:**
   - Status deve mudar de 'pending' para 'paid'/'failed'

3. **Verificar banco de dados:**
   ```bash
   python manage.py shell -c "from cart.models import Order; print(Order.objects.get(id=X).status)"
   ```

### Pagamentos duplicados

- Implementar idempotência: usar `paysuite_reference` como chave única
- Verificar no webhook se Payment já foi processado antes de atualizar

---

## 📚 Recursos Adicionais

- [Documentação Paysuite](https://developer.paysuite.co.mz/)
- [Django Security Checklist](https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/)
- [Railway Deployment Guide](https://docs.railway.app/)
- [Render Deployment Guide](https://render.com/docs)

---

## ✅ Resumo Executivo

Para garantir funcionamento em produção:

1. **Configurar `WEBHOOK_BASE_URL`** com URL pública HTTPS
2. **Adicionar validação de webhook** com secret/signature
3. **Configurar logs estruturados** para monitoramento
4. **Testar webhook manualmente** antes de produção
5. **Monitorar métricas** de sucesso/falha
6. **Implementar retry** para webhooks falhados
7. **Garantir HTTPS** em toda comunicação
8. **Testar fluxo completo** com pagamento real

Com essas configurações, o sistema funcionará perfeitamente em produção! 🚀
