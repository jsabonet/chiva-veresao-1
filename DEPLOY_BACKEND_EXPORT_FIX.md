# Deploy do Backend - Correção de Exports

## Problema
O frontend está atualizado (Cloudflare auto-deploy), mas o backend Django ainda usa código antigo com o bug `payment_method`.

## Solução: Deploy Manual do Backend

### Opção 1: SSH + Git Pull (Recomendado)

```bash
# 1. Conectar ao servidor
ssh root@157.230.16.193

# 2. Navegar para o diretório do backend
cd /caminho/para/versao_1_chiva/backend

# 3. Puxar as últimas alterações
git pull origin main

# 4. Reiniciar o Django (escolha um):

# Se usar Gunicorn com systemd:
sudo systemctl restart gunicorn

# Se usar Docker:
docker-compose restart backend

# Se usar supervisor:
sudo supervisorctl restart django

# 5. Verificar logs
# Gunicorn:
sudo journalctl -u gunicorn -f

# Docker:
docker-compose logs -f backend
```

### Opção 2: Deploy via Docker (se aplicável)

```bash
# No servidor
cd /caminho/para/versao_1_chiva
docker-compose pull backend
docker-compose up -d backend
docker-compose logs -f backend
```

### Opção 3: Deploy Manual de Arquivos

Se não tiver acesso Git no servidor:

```bash
# 1. No local, empacotar o arquivo modificado
cd D:\Projectos\versao_1_chiva
tar -czf export_fix.tar.gz backend/cart/order_views.py

# 2. Enviar para servidor
scp export_fix.tar.gz root@157.230.16.193:/tmp/

# 3. No servidor
ssh root@157.230.16.193
cd /caminho/para/versao_1_chiva
tar -xzf /tmp/export_fix.tar.gz

# 4. Reiniciar Django
sudo systemctl restart gunicorn
```

## Verificação Pós-Deploy

```bash
# Testar endpoint diretamente no servidor
curl -H "Authorization: Bearer SEU_TOKEN" \
  "http://localhost:8000/api/cart/admin/export/orders/?export_format=pdf"

# Deve retornar PDF (não erro 500)
```

## Mudanças Incluídas no Fix

1. **Correção Payment.method**: 
   - Antes: `first_payment.payment_method` ❌
   - Agora: `first_payment.method` ✅

2. **Correção shipping_address**:
   - Antes: `order.shipping_address[:100]` ❌ (JSON não pode ser sliced)
   - Agora: `order.get_shipping_address_display()[:100]` ✅

3. **Parâmetro export_format**:
   - Antes: `format=pdf` (causava 404 por DRF negotiation)
   - Agora: `export_format=pdf` ✅

## Commits Relevantes

- `784035d` - Export fix: avoid DRF format negotiation
- `ee948a4` - Fix: Remove duplicate /api from export endpoints

## Próximos Passos

Após deploy do backend:

1. ✅ Limpar cache do browser (Ctrl+Shift+R)
2. ✅ Testar exportação em Dashboard
3. ✅ Testar exportação em Pedidos (Excel, CSV, PDF)
4. ✅ Testar exportação em Clientes

## Se Ainda Houver Problemas

```bash
# Ver logs do backend em tempo real
sudo journalctl -u gunicorn -f

# Ou se Docker:
docker-compose logs -f backend

# Verificar se código foi atualizado:
grep "getattr(first_payment, 'method'" backend/cart/order_views.py
# Deve retornar a linha com getattr
```
