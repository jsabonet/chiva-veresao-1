#!/usr/bin/env python3
"""
Script para testar manualmente se o webhook está funcionando
"""
import requests
import json

# Configuração
WEBHOOK_URL_PROD = "https://chivacomputer.co.mz/api/cart/payments/webhook/"
WEBHOOK_URL_LOCAL = "http://127.0.0.1:8000/api/cart/payments/webhook/"

# Payload de teste - simula webhook do PaySuite para payment_id=10
test_payload = {
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
}

def test_webhook(url, name):
    """Testa se o webhook está acessível e respondendo"""
    print(f"\n{'='*60}")
    print(f"🧪 Testando: {name}")
    print(f"URL: {url}")
    print(f"{'='*60}")
    
    try:
        # Fazer POST com payload de teste
        response = requests.post(
            url,
            json=test_payload,
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Signature": "test-signature"
            },
            timeout=10
        )
        
        print(f"\n✅ RESPOSTA RECEBIDA:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        try:
            print(f"   Body: {response.json()}")
        except:
            print(f"   Body (text): {response.text[:200]}")
        
        # Interpretar resultado
        if response.status_code == 200:
            print(f"\n🎉 SUCESSO! Webhook está funcionando!")
            return True
        elif response.status_code == 400:
            print(f"\n⚠️  Webhook respondeu mas rejeitou payload (esperado se assinatura inválida)")
            return True
        elif response.status_code == 404:
            print(f"\n❌ Webhook NÃO ENCONTRADO! Endpoint não existe.")
            return False
        elif response.status_code >= 500:
            print(f"\n❌ Erro no servidor! Backend pode estar com problema.")
            return False
        else:
            print(f"\n⚠️  Status inesperado: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError as e:
        print(f"\n❌ ERRO DE CONEXÃO: Não foi possível conectar")
        print(f"   {str(e)}")
        return False
    except requests.exceptions.Timeout:
        print(f"\n❌ TIMEOUT: Servidor não respondeu em 10 segundos")
        return False
    except Exception as e:
        print(f"\n❌ ERRO INESPERADO: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔍 TESTE DE WEBHOOK DO PAYSUITE")
    print("="*60)
    print("\nEste script testa se o webhook está acessível.")
    print("Ele envia um webhook de teste simulando o PaySuite.\n")
    
    # Teste 1: Produção
    prod_ok = test_webhook(WEBHOOK_URL_PROD, "PRODUÇÃO (chivacomputer.co.mz)")
    
    # Teste 2: Local (apenas se estiver rodando localmente)
    print("\n" + "="*60)
    print("⚠️  OPCIONAL: Testar local")
    print("="*60)
    test_local = input("Testar localhost também? (S/n): ").strip().lower()
    
    if test_local != 'n':
        local_ok = test_webhook(WEBHOOK_URL_LOCAL, "LOCAL (127.0.0.1)")
    else:
        local_ok = None
    
    # Resumo
    print("\n" + "="*60)
    print("📊 RESUMO DOS TESTES")
    print("="*60)
    print(f"\nProdução (chivacomputer.co.mz): {'✅ OK' if prod_ok else '❌ FALHOU'}")
    if local_ok is not None:
        print(f"Local (127.0.0.1): {'✅ OK' if local_ok else '❌ FALHOU'}")
    
    # Recomendações
    print("\n" + "="*60)
    print("💡 RECOMENDAÇÕES")
    print("="*60)
    
    if not prod_ok:
        print("\n❌ WEBHOOK DE PRODUÇÃO NÃO ESTÁ FUNCIONANDO!")
        print("\nPossíveis causas:")
        print("1. Nginx não está configurado para essa rota")
        print("2. Backend não está rodando")
        print("3. Firewall está bloqueando")
        print("4. URL está incorreta")
        print("\nVerificar:")
        print("  docker compose logs backend")
        print("  docker compose ps")
    else:
        print("\n✅ WEBHOOK DE PRODUÇÃO ESTÁ OK!")
        print("\nAgora você precisa:")
        print("1. Atualizar URL no dashboard do PaySuite")
        print("2. Mudar de: http://127.0.0.1:8000/...")
        print("3. Para: https://chivacomputer.co.mz/api/cart/payments/webhook/")
        print("\nDepois disso, os webhooks do PaySuite chegarão!")
    
    print("\n" + "="*60)
