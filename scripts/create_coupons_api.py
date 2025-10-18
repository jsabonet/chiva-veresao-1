#!/usr/bin/env python3
"""
Script para criar cupons via API Admin
Requer token de admin
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "https://chivacomputer.co.mz/api"

# Token de admin - você precisa obter isso fazendo login como admin
# Para obter: fazer login no frontend como admin e pegar o token do localStorage
ADMIN_TOKEN = input("Cole o token de admin do Firebase (ou pressione Enter para tentar sem autenticação): ").strip()

headers = {}
if ADMIN_TOKEN:
    headers["Authorization"] = f"Bearer {ADMIN_TOKEN}"

coupons = [
    {
        "code": "TESTE20",
        "name": "Teste 20%",
        "description": "20% de desconto para testes",
        "discount_type": "percentage",
        "discount_value": "20.00",
        "valid_from": datetime.now().isoformat(),
        "valid_until": (datetime.now() + timedelta(days=90)).isoformat(),
        "is_active": True
    },
    {
        "code": "OUT10",
        "name": "Outubro 10%",
        "description": "10% de desconto válido em Outubro",
        "discount_type": "percentage",
        "discount_value": "10.00",
        "valid_from": datetime.now().isoformat(),
        "valid_until": (datetime.now() + timedelta(days=30)).isoformat(),
        "is_active": True
    },
    {
        "code": "BEMVINDO50",
        "name": "Boas-vindas 50 MZN",
        "description": "50 MZN de desconto",
        "discount_type": "fixed",
        "discount_value": "50.00",
        "minimum_amount": "200.00",
        "valid_from": datetime.now().isoformat(),
        "valid_until": (datetime.now() + timedelta(days=90)).isoformat(),
        "is_active": True
    }
]

print("=" * 60)
print("CRIANDO CUPONS VIA API")
print("=" * 60)

for coupon_data in coupons:
    try:
        response = requests.post(
            f"{BASE_URL}/cart/admin/coupons/",
            json=coupon_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            print(f"✅ Criado: {coupon_data['code']}")
        elif response.status_code == 400 and "already exists" in response.text.lower():
            print(f"⚠️  Já existe: {coupon_data['code']}")
        else:
            print(f"❌ Erro ao criar {coupon_data['code']}: {response.status_code}")
            print(f"   {response.text[:200]}")
    except Exception as e:
        print(f"❌ Exceção ao criar {coupon_data['code']}: {e}")

print("\n" + "=" * 60)
print("LISTANDO CUPONS CRIADOS")
print("=" * 60)

try:
    response = requests.get(
        f"{BASE_URL}/cart/admin/coupons/",
        headers=headers,
        timeout=10
    )
    
    if response.status_code == 200:
        coupons_list = response.json()
        if isinstance(coupons_list, list):
            for c in coupons_list:
                print(f"  {c.get('code')}: {c.get('name')} - Ativo: {c.get('is_active')}")
        else:
            print(f"Resposta: {coupons_list}")
    else:
        print(f"Erro ao listar: {response.status_code}")
        print(response.text[:200])
except Exception as e:
    print(f"Erro: {e}")

print("=" * 60)
