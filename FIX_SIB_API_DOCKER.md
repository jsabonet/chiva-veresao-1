# 🔧 FIX CRÍTICO: Adicionar sib-api-v3-sdk ao Docker

## 🎯 Problema Identificado

```
sib-api-v3-sdk não instalado. Instale com: pip install sib-api-v3-sdk
❌ [WEBHOOK] Email de confirmação: False
❌ [WEBHOOK] Email de status: False
❌ [WEBHOOK] Email admin: False
```

**Causa:** O pacote `sib-api-v3-sdk` (Brevo/SendInBlue) não estava listado em `requirements.prod.txt`, então o container Docker não o instalou.

**Resultado:** Sistema funcionava localmente mas falhava em produção.

---

## ✅ Solução Aplicada

### Arquivo Modificado

**backend/requirements.prod.txt**

```diff
  Pillow==10.1.0
  requests==2.31.0
+ sib-api-v3-sdk==7.6.0
```

---

## 🚀 Deploy - Passo a Passo

### 1. Commit Local (JÁ FEITO)

```bash
git add backend/requirements.prod.txt
git commit -m "fix: Adiciona sib-api-v3-sdk ao requirements.prod.txt"
git push origin main
```

### 2. No Servidor (FAZER AGORA)

```bash
# SSH no servidor
ssh root@seu-servidor

# Entrar no diretório do projeto
cd /home/chiva/chiva-veresao-1

# Pull das mudanças
git pull origin main

# Parar containers
docker compose down

# Rebuild do backend (importante!)
docker compose build backend

# Subir novamente
docker compose up -d

# Verificar logs
docker compose logs -f backend
```

### 3. Testar (CRÍTICO)

```bash
# Entrar no container
docker compose exec backend bash

# Rodar teste de emails
python teste_verificacao_emails_final.py

# DEVE aparecer:
# ✅ [WEBHOOK] Email de confirmação: True
# ✅ [WEBHOOK] Email de status: True
# ✅ [WEBHOOK] Email admin: True
```

---

## 🧪 Validação

### Antes (Produção)

```
❌ [WEBHOOK] Email de confirmação: False
❌ [WEBHOOK] Email de status: False
❌ [WEBHOOK] Email admin: False
```

### Depois (Esperado)

```
✅ [WEBHOOK] Email de confirmação: True
✅ [WEBHOOK] Email de status: True
✅ [WEBHOOK] Email admin: True
```

---

## 📋 Checklist de Deploy

- [ ] 1. Commit e push feitos
- [ ] 2. SSH no servidor
- [ ] 3. `git pull origin main`
- [ ] 4. `docker compose down`
- [ ] 5. `docker compose build backend` ⚠️ **IMPORTANTE**
- [ ] 6. `docker compose up -d`
- [ ] 7. Verificar logs: `docker compose logs backend | grep "sib-api-v3-sdk"`
- [ ] 8. Testar: `docker compose exec backend python teste_verificacao_emails_final.py`
- [ ] 9. Ver `✅ True` nos emails
- [ ] 10. Fazer compra real de teste

---

## ⚠️ Pontos de Atenção

### 1. Rebuild do Container é OBRIGATÓRIO

```bash
# ❌ ERRADO (não vai instalar o pacote novo)
docker compose up -d

# ✅ CORRETO (instala dependências novas)
docker compose build backend
docker compose up -d
```

### 2. Verificar se Pacote Foi Instalado

```bash
docker compose exec backend pip list | grep sib-api-v3-sdk

# Deve retornar:
# sib-api-v3-sdk    7.6.0
```

### 3. Limpar Cache se Necessário

```bash
# Se rebuild não funcionar, force:
docker compose build --no-cache backend
```

---

## 🎯 Após o Deploy

### Fazer Compra Real de Teste

1. Ir para o site
2. Adicionar produto ao carrinho
3. Fazer checkout com email real
4. Pagar com M-Pesa
5. Aguardar confirmação
6. **VERIFICAR EMAIL** (incluindo SPAM)

### Observar Logs em Tempo Real

```bash
# Terminal 1: Logs gerais
docker compose logs -f backend

# Terminal 2: Grep específico para emails
docker compose logs -f backend | grep "WEBHOOK\|POLLING"
```

### Procurar por:

```
🚀 [WEBHOOK] Iniciando envio de emails para order XXX
✅ [WEBHOOK] Email de confirmação: True
✅ [WEBHOOK] Email de status: True
✅ [WEBHOOK] Email admin: True
```

---

## 🔍 Troubleshooting

### Se ainda aparecer "sib-api-v3-sdk não instalado"

```bash
# 1. Verificar se requirements.prod.txt tem o pacote
docker compose exec backend cat requirements.prod.txt | grep sib-api

# 2. Verificar qual requirements está sendo usado no Dockerfile
docker compose exec backend cat Dockerfile | grep requirements

# 3. Instalar manualmente (temporário)
docker compose exec backend pip install sib-api-v3-sdk==7.6.0

# 4. Testar imediatamente
docker compose exec backend python teste_verificacao_emails_final.py

# 5. Se funcionar, fazer rebuild adequado
docker compose down
docker compose build --no-cache backend
docker compose up -d
```

### Se emails ainda retornam False

```bash
# Verificar se API Key do Brevo está configurada
docker compose exec backend python -c "from django.conf import settings; print(settings.BREVO_API_KEY[:20])"

# Deve retornar algo como: xkeysib-03bf459ff7e6...
```

---

## 📊 Tempo Estimado

| Etapa | Tempo |
|-------|-------|
| Commit e Push | 1 min |
| SSH e Git Pull | 1 min |
| Docker Rebuild | 3-5 min |
| Testes | 2 min |
| **TOTAL** | **7-10 min** |

---

## ✅ Sucesso Confirmado Quando

1. ✅ Container iniciou sem erros
2. ✅ `pip list` mostra `sib-api-v3-sdk`
3. ✅ Teste retorna `True` para todos os emails
4. ✅ Compra real envia emails
5. ✅ Cliente recebe emails na caixa de entrada

---

## 🚨 Se Tudo Falhar

### Solução Emergencial

```bash
# 1. Adicionar variável de ambiente para debug
docker compose exec backend bash
export DEBUG=True

# 2. Instalar sib-api-v3-sdk manualmente
pip install sib-api-v3-sdk==7.6.0

# 3. Restart do gunicorn
pkill -HUP gunicorn

# 4. Testar
python teste_verificacao_emails_final.py

# Esta solução é temporária!
# Ainda precisa fazer rebuild adequado depois.
```

---

## 📝 Notas

- **Versão do Pacote:** `7.6.0` (estável e testada)
- **Alternativa:** Se Brevo não funcionar, pode usar SMTP direto do Gmail/Outlook
- **Documentação Brevo:** https://developers.brevo.com/docs

---

**Data:** 21 de Outubro de 2025  
**Status:** 🔴 Aguardando Deploy  
**Prioridade:** 🔴 CRÍTICA (Emails não funcionam sem isso)
