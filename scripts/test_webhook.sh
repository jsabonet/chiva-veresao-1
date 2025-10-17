#!/bin/bash

# Script para testar webhook do PaySuite usando apenas curl
# Não precisa de Python, requests ou outras dependências

echo "=================================================="
echo "🧪 TESTE DE WEBHOOK DO PAYSUITE"
echo "=================================================="
echo ""

# URLs
WEBHOOK_URL_PROD="https://chivacomputer.co.mz/api/cart/payments/webhook/"
WEBHOOK_URL_LOCAL="http://localhost:8000/api/cart/payments/webhook/"

# Payload de teste - simula webhook do PaySuite para payment_id=10
TEST_PAYLOAD='{
  "event": "payment.failed",
  "data": {
    "id": "712bdfc6-2944-4a95-bdd6-f636bfb9b026",
    "reference": "ORD000010",
    "amount": 988000.00,
    "status": "failed",
    "reason": "insufficient_funds",
    "method": "mpesa",
    "phone": "258840000000"
  },
  "metadata": {
    "payment_id": 10,
    "order_id": 10
  }
}'

echo "=========================================="
echo "🌐 TESTE 1: Webhook de Produção (Externo)"
echo "=========================================="
echo "URL: $WEBHOOK_URL_PROD"
echo ""
echo "Enviando POST com payload de teste..."
echo ""

# Fazer requisição
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL_PROD" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d "$TEST_PAYLOAD" 2>&1)

# Extrair status code
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "Status Code: $HTTP_CODE"
echo "Response Body: $BODY"
echo ""

# Interpretar resultado
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCESSO! Webhook está funcionando!"
    echo "   O endpoint está acessível e respondeu OK."
elif [ "$HTTP_CODE" = "400" ]; then
    echo "⚠️  Webhook respondeu mas rejeitou payload."
    echo "   Isso é NORMAL - assinatura de teste é inválida."
    echo "   O importante é que o endpoint EXISTE e está acessível!"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ ERRO! Webhook NÃO ENCONTRADO!"
    echo "   O endpoint não existe ou nginx não está configurado."
elif [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ]; then
    echo "❌ ERRO! Servidor com problema!"
    echo "   Backend pode não estar rodando."
elif [ -z "$HTTP_CODE" ]; then
    echo "❌ ERRO! Não foi possível conectar!"
    echo "   Verifique se o domínio está correto e acessível."
else
    echo "⚠️  Status Code inesperado: $HTTP_CODE"
fi

echo ""
echo "=========================================="
echo "🏠 TESTE 2: Webhook Local (Interno)"
echo "=========================================="
echo "URL: $WEBHOOK_URL_LOCAL"
echo ""
echo "Enviando POST com payload de teste..."
echo ""

# Fazer requisição local
RESPONSE_LOCAL=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL_LOCAL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d "$TEST_PAYLOAD" 2>&1)

# Extrair status code
HTTP_CODE_LOCAL=$(echo "$RESPONSE_LOCAL" | grep "HTTP_CODE:" | cut -d: -f2)
BODY_LOCAL=$(echo "$RESPONSE_LOCAL" | sed '/HTTP_CODE:/d')

echo "Status Code: $HTTP_CODE_LOCAL"
echo "Response Body: $BODY_LOCAL"
echo ""

# Interpretar resultado
if [ "$HTTP_CODE_LOCAL" = "200" ] || [ "$HTTP_CODE_LOCAL" = "400" ]; then
    echo "✅ OK! Backend está respondendo localmente."
elif [ "$HTTP_CODE_LOCAL" = "404" ]; then
    echo "❌ ERRO! Endpoint não encontrado no backend."
elif [ -z "$HTTP_CODE_LOCAL" ]; then
    echo "❌ ERRO! Backend não está respondendo."
else
    echo "⚠️  Status Code inesperado: $HTTP_CODE_LOCAL"
fi

echo ""
echo "=================================================="
echo "📊 RESUMO"
echo "=================================================="
echo ""

# Resumo Produção
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    echo "✅ Webhook Externo (chivacomputer.co.mz): FUNCIONANDO"
else
    echo "❌ Webhook Externo (chivacomputer.co.mz): COM PROBLEMA"
fi

# Resumo Local
if [ "$HTTP_CODE_LOCAL" = "200" ] || [ "$HTTP_CODE_LOCAL" = "400" ]; then
    echo "✅ Webhook Interno (localhost): FUNCIONANDO"
else
    echo "❌ Webhook Interno (localhost): COM PROBLEMA"
fi

echo ""
echo "=================================================="
echo "💡 PRÓXIMOS PASSOS"
echo "=================================================="
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    echo "✅ O webhook está acessível externamente!"
    echo ""
    echo "Agora você precisa:"
    echo "1. Acessar o dashboard do PaySuite"
    echo "2. Ir para Settings → Webhooks"
    echo "3. Mudar a URL de:"
    echo "   ❌ http://127.0.0.1:8000/api/cart/payments/webhook/"
    echo "   Para:"
    echo "   ✅ https://chivacomputer.co.mz/api/cart/payments/webhook/"
    echo "4. Salvar as configurações"
    echo ""
    echo "Depois disso, fazer novo pagamento de teste!"
else
    echo "❌ O webhook NÃO está acessível externamente!"
    echo ""
    echo "Possíveis problemas:"
    echo "1. Nginx não está configurado para essa rota"
    echo "2. Backend não está rodando"
    echo "3. Firewall bloqueando"
    echo ""
    echo "Verificar:"
    echo "  docker compose ps"
    echo "  docker compose logs backend"
    echo "  nginx -t"
fi

echo ""
echo "=================================================="
