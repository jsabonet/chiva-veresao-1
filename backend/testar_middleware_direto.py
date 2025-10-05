#!/usr/bin/env python
"""
Testar o middleware de autenticação diretamente
"""

import os
import sys
import django

# Configurar Django
sys.path.append('/d/Projectos/versao_1_chiva/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

import json
import base64
import time
from django.test import RequestFactory
from django.contrib.auth.models import User
from chiva_backend.firebase_auth import FirebaseAuthentication

def testar_middleware_diretamente():
    """Testar o middleware de autenticação diretamente"""
    
    print("🔧 TESTE DIRETO DO MIDDLEWARE")
    print("=" * 50)
    
    # Criar token fake
    firebase_uid = "7nPO6sQas5hwJJScdSry81Kz36E2"
    email = "jsabonete09@gmail.com"
    
    # Token estruturado corretamente
    header = {"alg": "RS256", "typ": "JWT"}
    current_time = int(time.time())
    payload = {
        "sub": firebase_uid,
        "uid": firebase_uid, 
        "user_id": firebase_uid,
        "email": email,
        "iat": current_time - 3600,
        "exp": current_time + 3600
    }
    
    def base64url_encode(data):
        json_str = json.dumps(data, separators=(',', ':'))
        encoded = base64.urlsafe_b64encode(json_str.encode('utf-8'))
        return encoded.decode('utf-8').rstrip('=')
    
    header_encoded = base64url_encode(header)
    payload_encoded = base64url_encode(payload)
    token = f"{header_encoded}.{payload_encoded}.fake_signature"
    
    print(f"🔐 Token criado: {len(token)} chars")
    print(f"   UID: {firebase_uid}")
    print(f"   Email: {email}")
    
    # Criar request fake
    factory = RequestFactory()
    request = factory.get('/api/cart/orders/')
    request.META['HTTP_AUTHORIZATION'] = f'Bearer {token}'
    
    # Testar middleware
    auth = FirebaseAuthentication()
    
    print(f"\n🧪 Testando middleware...")
    
    try:
        result = auth.authenticate(request)
        
        if result is None:
            print("   ❌ Middleware retornou None (não autenticado)")
        else:
            user, auth_data = result
            print(f"   ✅ Middleware funcionou!")
            print(f"   👤 Usuário: {user.username} ({user.email})")
            print(f"   🔑 Auth data: {type(auth_data)}")
            
            # Verificar pedidos do usuário autenticado
            orders_count = user.order_set.count()
            print(f"   📦 Pedidos do usuário: {orders_count}")
            
    except Exception as e:
        print(f"   ❌ Erro no middleware: {e}")
        import traceback
        traceback.print_exc()

def testar_view_com_usuario_correto():
    """Testar a view com o usuário correto"""
    
    print(f"\n📋 TESTE DA VIEW COM USUÁRIO CORRETO")
    print("=" * 50)
    
    from cart.order_views import user_orders
    
    firebase_uid = "7nPO6sQas5hwJJScdSry81Kz36E2"
    
    try:
        # Pegar usuário correto
        user = User.objects.get(username=firebase_uid)
        print(f"👤 Usuário: {user.username} ({user.email}, ID: {user.id})")
        
        # Verificar pedidos
        orders_direct = user.order_set.all()
        print(f"📦 Pedidos diretos: {orders_direct.count()}")
        
        for order in orders_direct:
            print(f"   #{order.order_number} - ${order.total_amount} - {order.status}")
        
        # Testar view
        factory = RequestFactory()
        request = factory.get('/api/cart/orders/')
        request.user = user
        
        response = user_orders(request)
        print(f"\n📊 Resposta da view:")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.data
            print(f"   Tipo: {type(data)}")
            
            if isinstance(data, dict):
                total = data.get('total_count', 'N/A')
                results = data.get('results', [])
                print(f"   Total count: {total}")
                print(f"   Results: {len(results)} pedidos")
                
                for result in results:
                    print(f"      #{result['order_number']} - ${result['total_amount']}")
            elif isinstance(data, list):
                print(f"   Lista: {len(data)} pedidos")
                for result in data:
                    print(f"      #{result['order_number']} - ${result['total_amount']}")
            else:
                print(f"   Dados: {data}")
        else:
            print(f"   Erro: {response.data}")
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    testar_middleware_diretamente()
    testar_view_com_usuario_correto()