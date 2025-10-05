#!/usr/bin/env python
"""
Consultar estrutura das tabelas de pedidos
"""

import os
import sys
import django

# Configurar Django
sys.path.append('/d/Projectos/versao_1_chiva/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.db import connection
from cart.models import Order, Payment
from django.contrib.auth.models import User

def consultar_tabelas_pedidos():
    """Consultar estrutura e dados das tabelas de pedidos"""
    
    print("📊 ESTRUTURA DAS TABELAS DE PEDIDOS")
    print("=" * 50)
    
    cursor = connection.cursor()
    
    # 1. Estrutura da tabela cart_order
    print("\n🗃️  TABELA: cart_order")
    print("-" * 30)
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'cart_order' 
        ORDER BY ordinal_position;
    """)
    columns = cursor.fetchall()
    for col in columns:
        nullable = "Sim" if col[2] == 'YES' else "Não"
        default = col[3] if col[3] else "N/A"
        print(f"   {col[0]:<25} {col[1]:<20} Null: {nullable:<5} Default: {default}")
    
    # 2. Estrutura da tabela cart_payment
    print("\n💳 TABELA: cart_payment")
    print("-" * 30)  
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'cart_payment' 
        ORDER BY ordinal_position;
    """)
    columns = cursor.fetchall()
    for col in columns:
        nullable = "Sim" if col[2] == 'YES' else "Não"
        default = col[3] if col[3] else "N/A"
        print(f"   {col[0]:<25} {col[1]:<20} Null: {nullable:<5} Default: {default}")
    
    # 3. Contagem de pedidos por status
    print("\n📈 ESTATÍSTICAS DOS PEDIDOS")
    print("-" * 30)
    cursor.execute("SELECT status, COUNT(*) FROM cart_order GROUP BY status;")
    status_counts = cursor.fetchall()
    total_pedidos = sum([count for status, count in status_counts])
    
    print(f"   Total de pedidos: {total_pedidos}")
    for status, count in status_counts:
        print(f"   {status:<15}: {count} pedidos")
    
    # 4. Últimos pedidos
    print("\n📋 ÚLTIMOS 5 PEDIDOS")
    print("-" * 30)
    cursor.execute("""
        SELECT o.id, o.order_number, u.email, o.status, o.total_amount, o.created_at 
        FROM cart_order o 
        LEFT JOIN auth_user u ON o.user_id = u.id 
        ORDER BY o.created_at DESC 
        LIMIT 5;
    """)
    orders = cursor.fetchall()
    
    for order in orders:
        order_id, order_number, user_email, status, total, created = order
        created_str = created.strftime("%Y-%m-%d %H:%M:%S") if created else "N/A"
        print(f"   #{order_number} - {user_email or 'N/A'} - {status} - ${total} - {created_str}")
    
    # 5. Relação entre pedidos e pagamentos
    print("\n💰 RELAÇÃO PEDIDOS-PAGAMENTOS")
    print("-" * 30)
    cursor.execute("""
        SELECT 
            COUNT(DISTINCT o.id) as total_pedidos,
            COUNT(p.id) as total_pagamentos,
            SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) as pagamentos_pagos
        FROM cart_order o 
        LEFT JOIN cart_payment p ON o.id = p.order_id;
    """)
    stats = cursor.fetchone()
    
    print(f"   Pedidos: {stats[0]}")
    print(f"   Pagamentos: {stats[1]}")
    print(f"   Pagamentos pagos: {stats[2]}")

def mostrar_exemplo_pedido():
    """Mostrar exemplo detalhado de um pedido"""
    
    print("\n🔍 EXEMPLO DETALHADO DE UM PEDIDO")
    print("=" * 50)
    
    try:
        # Pegar o último pedido
        order = Order.objects.select_related('user').prefetch_related('payments').last()
        
        if order:
            print(f"📦 Pedido: #{order.order_number}")
            print(f"   ID: {order.id}")
            print(f"   Usuário: {order.user.email if order.user else 'N/A'}")
            print(f"   Status: {order.status}")
            print(f"   Total: ${order.total_amount}")
            print(f"   Frete: ${order.shipping_cost}")
            print(f"   Método de envio: {order.shipping_method}")
            print(f"   Criado em: {order.created_at}")
            print(f"   Atualizado em: {order.updated_at}")
            
            # Mostrar endereço
            if order.shipping_address:
                print(f"   Endereço: {order.shipping_address}")
            
            # Mostrar pagamentos
            payments = order.payments.all()
            print(f"\n💳 Pagamentos ({len(payments)}):")
            for payment in payments:
                print(f"     - {payment.method}: ${payment.amount} ({payment.status})")
        else:
            print("   Nenhum pedido encontrado")
            
    except Exception as e:
        print(f"   Erro ao consultar pedido: {e}")

if __name__ == '__main__':
    consultar_tabelas_pedidos()
    mostrar_exemplo_pedido()