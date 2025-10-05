#!/usr/bin/env python
"""
Investigar por que a API retorna 0 pedidos quando há 3 no banco
"""

import os
import sys
import django

# Configurar Django
sys.path.append('/d/Projectos\versao_1_chiva\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.contrib.auth.models import User
from cart.models import Order
from django.db import connection

def investigar_discrepancia_usuario():
    """Investigar por que usuário tem pedidos no banco mas API retorna 0"""
    
    print("🔍 INVESTIGAÇÃO: DISCREPÂNCIA USUÁRIO vs PEDIDOS")
    print("=" * 60)
    
    # 1. Buscar usuário Firebase
    firebase_uid = "7nPO6sQas5hwJJScdSry81Kz36E2"
    
    try:
        user = User.objects.get(username=firebase_uid)
        print(f"👤 Usuário encontrado:")
        print(f"   ID: {user.id}")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Ativo: {user.is_active}")
    except User.DoesNotExist:
        print("❌ Usuário não encontrado")
        return
    
    # 2. Buscar pedidos diretamente
    pedidos_diretos = Order.objects.filter(user=user)
    print(f"\n📦 Pedidos diretos do usuário: {pedidos_diretos.count()}")
    
    for pedido in pedidos_diretos:
        print(f"   #{pedido.order_number} - ${pedido.total_amount} - {pedido.status} - User ID: {pedido.user_id}")
    
    # 3. Buscar todos os pedidos com esse user_id
    pedidos_por_user_id = Order.objects.filter(user_id=user.id)
    print(f"\n📋 Pedidos por user_id ({user.id}): {pedidos_por_user_id.count()}")
    
    # 4. SQL direto para verificar
    cursor = connection.cursor()
    cursor.execute("""
        SELECT id, order_number, user_id, total_amount, status, created_at
        FROM cart_order 
        WHERE user_id = %s
        ORDER BY created_at DESC;
    """, [user.id])
    
    pedidos_sql = cursor.fetchall()
    print(f"\n🔍 Consulta SQL direta: {len(pedidos_sql)} pedidos")
    
    for pedido in pedidos_sql:
        print(f"   ID: {pedido[0]}, #{pedido[1]}, User: {pedido[2]}, ${pedido[3]}, {pedido[4]}")
    
    # 5. Verificar se há filtros na view
    print(f"\n🔎 ANÁLISE DA VIEW user_orders")
    print("-" * 40)
    
    # Simular a mesma consulta da view
    from cart.order_views import user_orders
    from django.http import HttpRequest
    from django.contrib.auth import get_user_model
    
    # Criar request fake
    request = HttpRequest()
    request.user = user
    request.method = 'GET'
    request.GET = {}
    
    # Executar a mesma lógica da view
    orders = Order.objects.filter(
        user=request.user
    ).prefetch_related('payments', 'status_history').order_by('-created_at')
    
    print(f"   Resultado da consulta da view: {orders.count()} pedidos")
    
    # Listar
    for order in orders:
        print(f"   View result: #{order.order_number} - {order.status} - User: {order.user_id}")

def verificar_outros_usuarios():
    """Verificar se outros usuários têm o mesmo problema"""
    
    print(f"\n🔍 VERIFICAÇÃO DE OUTROS USUÁRIOS")
    print("=" * 50)
    
    # Buscar usuários com mais pedidos
    usuarios_com_pedidos = Order.objects.values('user_id').annotate(
        count=Count('id')
    ).order_by('-count')[:5]
    
    for user_stat in usuarios_com_pedidos:
        user_id = user_stat['user_id']
        count = user_stat['count']
        
        try:
            user = User.objects.get(id=user_id)
            print(f"\n👤 User ID {user_id} ({user.email}): {count} pedidos no total")
            
            # Testar consulta da view para este usuário
            orders_view = Order.objects.filter(user=user).count()
            print(f"   Consulta view: {orders_view} pedidos")
            
            if count != orders_view:
                print(f"   ⚠️  DISCREPÂNCIA: {count} no agregado vs {orders_view} na view")
            else:
                print(f"   ✅ Consistente")
                
        except User.DoesNotExist:
            print(f"   ❌ User ID {user_id} não existe (pedidos órfãos)")

if __name__ == '__main__':
    from django.db.models import Count
    investigar_discrepancia_usuario()
    verificar_outros_usuarios()