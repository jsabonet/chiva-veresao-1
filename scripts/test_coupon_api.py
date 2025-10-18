"""
Teste de conexão com produção para verificar cupons
"""
import requests

BASE_URL = "https://chivacomputer.co.mz/api"

def test_coupon_validation():
    """Testa validação de cupom"""
    print("=" * 60)
    print("TESTE: Validação de Cupom em Produção")
    print("=" * 60)
    
    # Teste 1: Validar TESTE20
    print("\n1. Validando cupom TESTE20 com cart_total=1000...")
    try:
        response = requests.get(
            f"{BASE_URL}/cart/coupon/validate/",
            params={"code": "TESTE20", "cart_total": "1000"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Válido: {data.get('valid')}")
            print(f"   💰 Desconto: {data.get('discount_amount')} MZN")
        else:
            print(f"   ❌ Erro: {response.text}")
    except Exception as e:
        print(f"   ❌ Exceção: {e}")
    
    # Teste 2: Validar OUT10
    print("\n2. Validando cupom OUT10 com cart_total=1000...")
    try:
        response = requests.get(
            f"{BASE_URL}/cart/coupon/validate/",
            params={"code": "OUT10", "cart_total": "1000"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Válido: {data.get('valid')}")
            print(f"   💰 Desconto: {data.get('discount_amount')} MZN")
        else:
            print(f"   ❌ Erro: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Exceção: {e}")
    
    # Teste 3: Cupom inválido
    print("\n3. Testando cupom inexistente...")
    try:
        response = requests.get(
            f"{BASE_URL}/cart/coupon/validate/",
            params={"code": "NAOEXISTE", "cart_total": "1000"},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Exceção: {e}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_coupon_validation()
