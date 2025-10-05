#!/usr/bin/env python
"""
Criar pedido para usuário real do frontend
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

def criar_pedido_para_usuario_real():
    """Criar pedido para o usuário real que está logado no frontend"""
    
    print("🧪 Criando pedido para usuário real do frontend...")
    
    # Dados do usuário real (do log)
    firebase_uid = "7nPO6sQas5hwJJScdSry81Kz36E2"
    email = "usuario@frontend.com"  # Email genérico, será atualizado se necessário
    
    # 1. Criar/obter usuário Django com Firebase UID como username
    try:
        user = User.objects.get(username=firebase_uid)
        print(f"✅ Usuário já existe: {user.username} ({user.email})")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=firebase_uid,
            email=email,
            first_name="Usuário",
            last_name="Frontend"
        )
        print(f"✅ Usuário criado: {user.username} ({user.email})")
    
    # 2. Obter produtos para o pedido
    try:
        products = Product.objects.all()[:3]  # Pegar 3 produtos
        if not products:
            print("❌ Nenhum produto encontrado na base de dados!")
            return
        print(f"📦 Produtos selecionados: {len(products)}")
        for prod in products:
            print(f"   - {prod.name} - ${prod.price}")
    except Exception as e:
        print(f"❌ Erro ao obter produtos: {e}")
        return
    
    # 3. Criar múltiplos pedidos
    pedidos_criados = []
    
    for i, product in enumerate(products, 1):
        try:
            # Gerar número de pedido único
            order_count = Order.objects.count() + 1
            order_number = f"CHV{datetime.now().strftime('%Y%m%d')}{order_count:04d}"
            
            order = Order.objects.create(
                user=user,
                order_number=order_number,
                status='paid',
                total_amount=product.price * i,  # Variação no preço
                shipping_address={
                    "street": f"Rua do Frontend, {i*100}",
                    "city": "Maputo",
                    "country": "Moçambique",
                    "phone": f"+258 84 {i}23 456{i}"
                }
            )
            
            print(f"🛍️ Pedido {i} criado: #{order.order_number}")
            print(f"   👤 Usuário: {order.user.username}")
            print(f"   💰 Total: ${order.total_amount}")
            print(f"   📊 Status: {order.status}")
            
            # 4. Criar pagamento
            payment = Payment.objects.create(
                order=order,
                method='card',
                amount=order.total_amount,
                status='paid',
                paysuite_reference=f'frontend_txn_{order_number}'
            )
            
            print(f"💳 Pagamento criado: {payment.paysuite_reference}")
            
            pedidos_criados.append(order)
            
        except Exception as e:
            print(f"❌ Erro ao criar pedido {i}: {e}")
    
    return pedidos_criados

if __name__ == '__main__':
    pedidos = criar_pedido_para_usuario_real()
    if pedidos:
        print(f"\n🎉 {len(pedidos)} pedidos criados com sucesso!")
        print("   Agora os pedidos devem aparecer no frontend.")
        for pedido in pedidos:
            print(f"   - #{pedido.order_number} - ${pedido.total_amount}")
    else:
        print("\n❌ Falha ao criar pedidos.")