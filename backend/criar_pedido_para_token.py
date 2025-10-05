#!/usr/bin/env python
"""
Criar pedido para usuário específico que corresponde ao token de teste
"""

import os
import sys
import django

# Configurar Django
sys.path.append('/d/Projectos/versao_1_chiva/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.contrib.auth.models import User
from cart.models import Order, Payment
from products.models import Product
from datetime import datetime
from decimal import Decimal

def criar_usuario_e_pedido_para_token():
    """Criar usuário e pedido que corresponde ao token de teste"""
    
    print("🧪 Criando pedido para usuário do token de teste...")
    
    # Dados do usuário que correspondem ao token
    firebase_uid = "demo_firebase_uid"
    email = "demo@chiva.com"
    name = "Demo User"
    
    # 1. Criar/obter usuário Django com Firebase UID como username
    try:
        user = User.objects.get(username=firebase_uid)
        print(f"✅ Usuário já existe: {user.username} ({user.email})")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=firebase_uid,
            email=email,
            first_name="Demo",
            last_name="User"
        )
        print(f"✅ Usuário criado: {user.username} ({user.email})")
    
    # 2. Obter um produto para o pedido
    try:
        product = Product.objects.first()
        if not product:
            print("❌ Nenhum produto encontrado na base de dados!")
            return
        print(f"📦 Produto selecionado: {product.name} - ${product.price}")
    except Exception as e:
        print(f"❌ Erro ao obter produto: {e}")
        return
    
    # 3. Criar pedido
    try:
        # Gerar número de pedido único
        order_count = Order.objects.count() + 1
        order_number = f"CHV{datetime.now().strftime('%Y%m%d')}{order_count:04d}"
        
        order = Order.objects.create(
            user=user,
            order_number=order_number,
            status='paid',
            total_amount=product.price,
            shipping_address={
                "street": "Rua de Teste, 123",
                "city": "Maputo",
                "country": "Moçambique",
                "phone": "+258 84 123 4567"
            }
        )
        
        print(f"🛍️ Pedido criado: #{order.order_number}")
        print(f"   👤 Usuário: {order.user.username}")
        print(f"   💰 Total: ${order.total_amount}")
        print(f"   📊 Status: {order.status}")
        
        # 4. Criar pagamento
        payment = Payment.objects.create(
            order=order,
            method='card',
            amount=order.total_amount,
            status='paid',
            paysuite_reference=f'test_txn_{order_number}'
        )
        
        print(f"💳 Pagamento criado: {payment.paysuite_reference}")
        print(f"   💰 Valor: ${payment.amount}")
        print(f"   📊 Status: {payment.status}")
        
        return order
        
    except Exception as e:
        print(f"❌ Erro ao criar pedido: {e}")
        return None

if __name__ == '__main__':
    pedido = criar_usuario_e_pedido_para_token()
    if pedido:
        print(f"\n🎉 Pedido #{pedido.order_number} criado com sucesso!")
        print("   Agora teste a API novamente com o token.")
    else:
        print("\n❌ Falha ao criar pedido.")