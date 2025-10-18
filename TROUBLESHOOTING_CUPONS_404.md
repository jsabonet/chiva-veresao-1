# Troubleshooting: Cupons API 404 em Produção

## Problema
```
POST https://chivacomputer.co.mz/api/cart/admin/coupons/ 404 (Not Found)
POST http://127.0.0.1:8000/api/cart/admin/coupons/ 403 (Forbidden)
```

## Causas Possíveis

### 1. Código Não Atualizado no Servidor
O servidor não tem as novas rotas de cupons.

**Solução:**
```bash
ssh root@chivacomputer.co.mz
cd /home/chiva/chiva-veresao-1
git pull origin main
cd backend
python manage.py migrate
sudo systemctl restart gunicorn
```

### 2. URLs Não Incluídas no urls.py Principal
As rotas de cupons estão em `cart/urls.py` mas podem não estar incluídas.

**Verificar:**
```bash
# No servidor
cd /home/chiva/chiva-veresao-1/backend
grep -r "admin/coupons" .
cat cart/urls.py | grep coupons
cat chiva_backend/urls.py | grep cart
```

**Deve mostrar:**
```python
# cart/urls.py
path('admin/coupons/', views.admin_coupons_list_create, name='admin_coupons_list_create'),
path('admin/coupons/<int:coupon_id>/', views.admin_coupon_detail, name='admin_coupon_detail'),

# chiva_backend/urls.py
path('cart/', include('cart.urls')),
```

### 3. Permissões (403 Local)
O usuário não tem permissão de admin.

**Verificar:**
```bash
python manage.py shell
>>> from customers.models import ExternalAuthUser
>>> user = ExternalAuthUser.objects.get(email='jsabonete09@gmail.com')
>>> print(f"is_admin: {user.is_admin}")
>>> user.is_admin = True
>>> user.save()
```

### 4. Gunicorn Não Reiniciado
O servidor não carregou o novo código.

**Solução:**
```bash
sudo systemctl restart gunicorn
sudo systemctl status gunicorn
```

### 5. Nginx Cache
O Nginx pode estar cacheando respostas antigas.

**Solução:**
```bash
sudo systemctl restart nginx
# ou limpar cache
sudo rm -rf /var/cache/nginx/*
```

## Script de Deploy Automático

Execute no servidor:
```bash
cd /home/chiva/chiva-veresao-1
bash scripts/deploy_cupons_fix.sh
```

Ou copie o conteúdo de `scripts/deploy_cupons_fix.sh` e execute.

## Teste Manual das APIs

### 1. Testar Localmente
```bash
# No backend local
python manage.py runserver

# Em outro terminal
curl -X GET http://127.0.0.1:8000/api/cart/admin/coupons/ \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Testar em Produção
```bash
curl -X GET https://chivacomputer.co.mz/api/cart/admin/coupons/ \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json"
```

## Verificar Logs

### Backend Logs (Gunicorn)
```bash
sudo journalctl -u gunicorn -n 50 --no-pager
# ou
sudo tail -f /var/log/gunicorn/error.log
```

### Nginx Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log | grep coupons
```

### Django Logs
```bash
cd /home/chiva/chiva-veresao-1/backend
tail -f logs/django.log
```

## Verificar Estrutura de URLs

```bash
cd /home/chiva/chiva-veresao-1/backend
python manage.py show_urls | grep coupon
```

Se não mostrar as rotas de cupons, há problema na configuração de URLs.

## Checklist Rápido

- [ ] Código atualizado no servidor? (`git pull`)
- [ ] Migrations aplicadas? (`python manage.py migrate`)
- [ ] Gunicorn reiniciado? (`systemctl restart gunicorn`)
- [ ] URLs configuradas? (`grep coupons cart/urls.py`)
- [ ] Permissões corretas? (IsAdmin permission)
- [ ] Token Firebase válido?
- [ ] Nginx funcionando? (`systemctl status nginx`)

## Solução Rápida (All-in-One)

Execute todos os comandos de uma vez:

```bash
ssh root@chivacomputer.co.mz << 'EOF'
cd /home/chiva/chiva-veresao-1
echo "=== Git Pull ==="
git pull origin main
echo "=== Migrations ==="
cd backend
python manage.py migrate
echo "=== Collect Static ==="
python manage.py collectstatic --noinput
echo "=== Restart Services ==="
sudo systemctl restart gunicorn
sudo systemctl restart nginx
echo "=== Check Status ==="
sudo systemctl status gunicorn --no-pager
echo "=== Test API ==="
curl -I https://chivacomputer.co.mz/api/cart/admin/coupons/
echo "=== Done ==="
EOF
```

## Se Ainda Não Funcionar

1. **Verificar ALLOWED_HOSTS** em `settings.py`:
   ```python
   ALLOWED_HOSTS = ['chivacomputer.co.mz', 'www.chivacomputer.co.mz', ...]
   ```

2. **Verificar CORS** em `settings.py`:
   ```python
   CORS_ALLOWED_ORIGINS = [
       'https://chivacomputer.co.mz',
       ...
   ]
   ```

3. **Verificar URL base** no frontend:
   ```typescript
   // frontend/.env.production
   VITE_API_URL=https://chivacomputer.co.mz/api
   ```

4. **Rebuild frontend**:
   ```bash
   cd frontend
   npm run build
   ```

## Contato para Suporte

Se o problema persistir, forneça:
1. Output de `git log -1 --oneline` (no servidor)
2. Output de `sudo journalctl -u gunicorn -n 50`
3. Output de `curl -I https://chivacomputer.co.mz/api/cart/admin/coupons/`
