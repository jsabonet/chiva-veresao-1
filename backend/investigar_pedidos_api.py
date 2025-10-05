#!/usr/bin/env python
"""
Investigar por que apenas 3 pedidos aparecem na API
"""

import os
import sys
import django

# Configurar Django
sys.path.append('/d/Projectos/versao_1_chiva/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

import json
import requests
from cart.models import Order, Payment
from django.contrib.auth.models import User
from django.db.models import Count

def investigar_discrepancia_pedidos():
    """Investigar por que só 3 pedidos aparecem na API"""
    
    print("🔍 INVESTIGAÇÃO: DISCREPÂNCIA DE PEDIDOS")
    print("=" * 60)
    
    # 1. Contar todos os pedidos no banco
    total_pedidos_db = Order.objects.count()
    print(f"📊 Total de pedidos no banco: {total_pedidos_db}")
    
    # 2. Verificar usuários diferentes
    usuarios_com_pedidos = Order.objects.values('user_id').annotate(count=Count('id')).order_by('-count')
    print(f"\n👥 Usuários com pedidos:")
    
    for user_stat in usuarios_com_pedidos:
        user_id = user_stat['user_id']
        count = user_stat['count']
        
        try:
            if user_id:
                user = User.objects.get(id=user_id)
                email = user.email or user.username
            else:
                email = "Usuário não encontrado/None"
        except User.DoesNotExist:
            email = f"Usuário ID {user_id} não existe"
            
        print(f"   User ID {user_id}: {count} pedidos - {email}")
    
    # 3. Testar API com diferentes usuários
    print(f"\n🌐 TESTANDO API COM DIFERENTES USUÁRIOS")
    print("-" * 50)
    
    # Testar com usuário que sabemos que tem pedidos
    test_users = [
        ("7nPO6sQas5hwJJScdSry81Kz36E2", "Firebase User Real"),
        ("jsabonete09@gmail.com", "Email como username"),
        ("demo@chiva.com", "Demo User")
    ]
    
    for user_id, description in test_users:
        print(f"\n🧪 Testando com {description} ({user_id}):")
        
        # Criar token fake para este usuário
        fake_token = f"fake-jwt-token-{user_id.replace('@', '-').replace('.', '-')}"
        
        headers = {
            'Authorization': f'Bearer {fake_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get('http://localhost:8000/api/cart/orders/', headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else data.get('count', 0)
                print(f"   Pedidos retornados: {count}")
                
                if isinstance(data, list) and data:
                    print(f"   Primeiro pedido: #{data[0].get('order_number', 'N/A')}")
            else:
                print(f"   Erro: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("   ❌ Servidor não está rodando")
        except Exception as e:
            print(f"   ❌ Erro: {e}")

def verificar_pedidos_por_user():
    """Verificar pedidos diretamente no banco por usuário"""
    
    print(f"\n📋 PEDIDOS POR USUÁRIO NO BANCO")
    print("=" * 50)
    
    # Verificar pedidos do usuário Firebase específico
    firebase_user_orders = Order.objects.filter(user__username="7nPO6sQas5hwJJScdSry81Kz36E2")
    print(f"🔥 Usuário Firebase (7nPO6sQas5hwJJScdSry81Kz36E2): {firebase_user_orders.count()} pedidos")
    
    for order in firebase_user_orders[:5]:  # Mostrar apenas os primeiros 5
        print(f"   #{order.order_number} - ${order.total_amount} - {order.status} - {order.created_at}")
    
    # Verificar outros usuários
    demo_user_orders = Order.objects.filter(user__email="demo@chiva.com")
    print(f"\n🎭 Usuário Demo (demo@chiva.com): {demo_user_orders.count()} pedidos")
    
    jsabonete_user_orders = Order.objects.filter(user__email="jsabonete09@gmail.com")
    print(f"\n📧 Usuário jsabonete09@gmail.com: {jsabonete_user_orders.count()} pedidos")

def verificar_middleware_auth():
    """Verificar como o middleware de autenticação está funcionando"""
    
    print(f"\n🔐 VERIFICAÇÃO DO MIDDLEWARE DE AUTENTICAÇÃO")
    print("=" * 50)
    
    from chiva_backend.firebase_auth import FirebaseAuthenticationMiddleware
    
    print("Middleware configurado em settings.py")
    print("Verificando lógica de bypass...")
    
    # Simular diferentes cenários de token
    test_scenarios = [
        ("Bearer fake-jwt-token-firebase", "Token fake para Firebase"),
        ("Bearer fake-jwt-token-demo", "Token fake para Demo"),
        ("Bearer real-firebase-token", "Token Firebase real (simulado)"),
        ("", "Sem token")
    ]
    
    for auth_header, description in test_scenarios:
        print(f"\n🧪 Cenário: {description}")
        print(f"   Header: {auth_header}")
        
        # Simular o que o middleware faria
        if auth_header.startswith("Bearer fake-jwt-token-"):
            user_identifier = auth_header.replace("Bearer fake-jwt-token-", "").replace("-", "@").replace("@", ".")
            if user_identifier.endswith(".com"):
                user_identifier = user_identifier.replace(".", "@", 1)
            print(f"   Usuário identificado: {user_identifier}")
            
            # Verificar se usuário existe
            try:
                user = User.objects.get(username=user_identifier)
                print(f"   ✅ Usuário encontrado: {user.email}")
            except User.DoesNotExist:
                try:
                    user = User.objects.get(email=user_identifier)
                    print(f"   ✅ Usuário encontrado por email: {user.email}")
                except User.DoesNotExist:
                    print(f"   ❌ Usuário não encontrado")

if __name__ == '__main__':
    investigar_discrepancia_pedidos()
    verificar_pedidos_por_user()
    verificar_middleware_auth()