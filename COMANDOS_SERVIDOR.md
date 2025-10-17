# 🔧 COMANDOS PARA SERVIDOR DE PRODUÇÃO

## 📍 Você está aqui:
```
root@ubuntu-s-1vcpu-2gb-fra1-01:/home/chiva/chiva-veresao-1/backend
app@d777634fe8ef:/app$  ← DENTRO DO CONTAINER
```

## ✅ COMANDOS CORRETOS:

### 1. Sair do Container
```bash
exit
```

### 2. Voltar para Raiz do Projeto
```bash
cd /home/chiva/chiva-veresao-1
```

### 3. Testar Webhook (Escolha UMA opção)

#### Opção A: Script Bash (Recomendado - Mais Simples)
```bash
bash scripts/test_webhook.sh
```

#### Opção B: Script Python (Requer requests)
```bash
# Instalar requests se necessário
pip3 install requests

# Rodar script
python3 scripts/test_webhook.py
```

#### Opção C: Teste Manual com cURL (Mais Rápido)
```bash
# Teste simples - só verifica se endpoint existe
curl -v https://chivacomputer.co.mz/api/cart/payments/webhook/

# Teste completo - envia webhook de teste
curl -X POST https://chivacomputer.co.mz/api/cart/payments/webhook/ \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.failed",
    "data": {
      "id": "712bdfc6-2944-4a95-bdd6-f636bfb9b026",
      "reference": "ORD000010",
      "amount": 988000.00,
      "status": "failed"
    }
  }'
```

## 📊 INTERPRETANDO RESULTADOS

### ✅ SUCESSO (200 ou 400)
```
< HTTP/1.1 200 OK        ← BOM!
ou
< HTTP/1.1 400 Bad Request  ← TAMBÉM BOM! (assinatura inválida é esperado)
```

**Significa:** Webhook está acessível! ✅  
**Ação:** Atualizar URL no dashboard do PaySuite

### ❌ ERRO 404
```
< HTTP/1.1 404 Not Found
```

**Significa:** Endpoint não existe  
**Ação:** Verificar nginx e backend

### ❌ ERRO 502/503
```
< HTTP/1.1 502 Bad Gateway
```

**Significa:** Backend não está respondendo  
**Ação:** Verificar se container está rodando

## 🔍 VERIFICAÇÕES ADICIONAIS

### Verificar se Backend Está Rodando
```bash
docker compose ps
```

**Esperado:**
```
NAME                    STATUS
backend                 Up X minutes
```

### Ver Logs do Backend
```bash
docker compose logs backend | tail -50
```

Procurar por erros ou warnings.

### Testar Localmente (Dentro do Servidor)
```bash
curl http://localhost:8000/api/cart/payments/webhook/
```

Se funcionar localmente mas não externamente = problema no nginx.

### Verificar Configuração do Nginx
```bash
cat /etc/nginx/sites-enabled/chiva
```

Procurar por:
```nginx
location /api/ {
    proxy_pass http://backend:8000;
    ...
}
```

## 🎯 RESULTADO ESPERADO

Após rodar o teste, você deve ver:

```
================================================
🧪 TESTE DE WEBHOOK DO PAYSUITE
================================================

==========================================
🌐 TESTE 1: Webhook de Produção (Externo)
==========================================
URL: https://chivacomputer.co.mz/api/cart/payments/webhook/

Enviando POST com payload de teste...

Status Code: 200
Response Body: {"ok":true}

✅ SUCESSO! Webhook está funcionando!
   O endpoint está acessível e respondeu OK.

==========================================
🏠 TESTE 2: Webhook Local (Interno)
==========================================
URL: http://localhost:8000/api/cart/payments/webhook/

Enviando POST com payload de teste...

Status Code: 200
Response Body: {"ok":true}

✅ OK! Backend está respondendo localmente.

================================================
📊 RESUMO
================================================

✅ Webhook Externo (chivacomputer.co.mz): FUNCIONANDO
✅ Webhook Interno (localhost): FUNCIONANDO

================================================
💡 PRÓXIMOS PASSOS
================================================

✅ O webhook está acessível externamente!

Agora você precisa:
1. Acessar o dashboard do PaySuite
2. Ir para Settings → Webhooks
3. Mudar a URL de:
   ❌ http://127.0.0.1:8000/api/cart/payments/webhook/
   Para:
   ✅ https://chivacomputer.co.mz/api/cart/payments/webhook/
4. Salvar as configurações

Depois disso, fazer novo pagamento de teste!
```

## 🚀 APÓS TESTE BEM-SUCEDIDO

### 1. Atualizar Dashboard do PaySuite
- Acessar: https://paysuite.tech/dashboard
- Settings → Webhooks
- Mudar URL para: `https://chivacomputer.co.mz/api/cart/payments/webhook/`
- Salvar

### 2. Fazer Teste de Pagamento
- Criar novo pedido no site
- Fazer pagamento (pode falhar de propósito)
- Aguardar 10 segundos
- Status deve atualizar automaticamente! 🎉

### 3. Monitorar Logs Durante Teste
```bash
docker compose logs -f backend | grep -i webhook
```

**Esperado:**
```
🔔 Webhook received: event=payment.failed, payment_id=11
✅ Synced order 11 status: pending → failed
```

## 📋 RESUMO DOS COMANDOS

```bash
# 1. Sair do container (se estiver dentro)
exit

# 2. Ir para raiz
cd /home/chiva/chiva-veresao-1

# 3. Testar webhook
bash scripts/test_webhook.sh

# 4. Se OK, atualizar PaySuite dashboard

# 5. Fazer teste de pagamento

# 6. Monitorar logs
docker compose logs -f backend | grep -i webhook
```

---

**Arquivo:** `scripts/test_webhook.sh` ← Mais fácil de usar!  
**Alternativa:** `scripts/test_webhook.py` ← Requer Python + requests
