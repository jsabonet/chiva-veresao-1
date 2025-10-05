#!/usr/bin/env python
"""
Investigar onde ficam os pedidos criados no modo demonstração
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
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

def investigar_pedidos_demonstracao():
    """Investigar onde estão os pedidos do modo demonstração"""
    
    print("🔍 INVESTIGAÇÃO: PEDIDOS DO MODO DEMONSTRAÇÃO")
    print("=" * 70)
    
    # 1. Pedidos criados nas últimas 2 horas (durante nossos testes)
    duas_horas_atras = timezone.now() - timedelta(hours=2)
    pedidos_recentes = Order.objects.filter(created_at__gte=duas_horas_atras).order_by('-created_at')
    
    print(f"\n📅 PEDIDOS CRIADOS NAS ÚLTIMAS 2 HORAS:")
    print(f"   Total: {pedidos_recentes.count()}")
    print("-" * 50)
    
    for pedido in pedidos_recentes:
        user_info = f"{pedido.user.email} (ID: {pedido.user.id})" if pedido.user else "Usuário NULO"
        print(f"   #{pedido.order_number} - {user_info}")
        print(f"      Total: ${pedido.total_amount} - Status: {pedido.status}")
        print(f"      Criado: {pedido.created_at}")
        
        # Verificar pagamentos
        pagamentos = pedido.payments.all()
        if pagamentos:
            for pag in pagamentos:
                print(f"      💳 Pagamento: {pag.method} - ${pag.amount} - {pag.status}")
        else:
            print(f"      💳 Sem pagamentos registrados")
        print()
    
    # 2. Usuários de teste/demonstração
    print(f"\n👥 USUÁRIOS DE TESTE/DEMONSTRAÇÃO:")
    print("-" * 50)
    
    usuarios_teste = User.objects.filter(
        Q(username__icontains='demo') |
        Q(username__icontains='test') |
        Q(email__icontains='demo') |
        Q(email__icontains='test')
    ).annotate(
        num_pedidos=Count('order')
    ).order_by('-date_joined')
    
    for user in usuarios_teste:
        print(f"   {user.username} ({user.email})")
        print(f"      ID: {user.id} - Pedidos: {user.num_pedidos}")
        print(f"      Criado: {user.date_joined}")
        
        # Mostrar últimos pedidos deste usuário
        pedidos_user = Order.objects.filter(user=user).order_by('-created_at')[:3]
        for pedido in pedidos_user:
            print(f"         └─ #{pedido.order_number} - ${pedido.total_amount} - {pedido.status}")
        print()
    
    # 3. Pedidos sem usuário (anônimos)
    pedidos_anonimos = Order.objects.filter(user__isnull=True).order_by('-created_at')
    print(f"\n👻 PEDIDOS ANÔNIMOS (SEM USUÁRIO):")
    print(f"   Total: {pedidos_anonimos.count()}")
    print("-" * 50)
    
    for pedido in pedidos_anonimos[:10]:  # Mostrar apenas os primeiros 10
        print(f"   #{pedido.order_number} - ${pedido.total_amount} - {pedido.status}")
        print(f"      Criado: {pedido.created_at}")
        
        # Verificar endereço para identificar origem
        if pedido.shipping_address:
            nome = pedido.shipping_address.get('name', 'N/A')
            email = pedido.shipping_address.get('email', 'N/A')
            phone = pedido.shipping_address.get('phone', 'N/A')
            print(f"      Cliente: {nome} - {email} - {phone}")
        print()
    
    # 4. Verificar usuário Firebase específico
    firebase_uid = "7nPO6sQas5hwJJScdSry81Kz36E2"
    print(f"\n🔥 USUÁRIO FIREBASE ESPECÍFICO ({firebase_uid}):")
    print("-" * 50)
    
    try:
        firebase_user = User.objects.get(username=firebase_uid)
        pedidos_firebase = Order.objects.filter(user=firebase_user).order_by('-created_at')
        
        print(f"   Usuário: {firebase_user.email} (ID: {firebase_user.id})")
        print(f"   Total de pedidos: {pedidos_firebase.count()}")
        print(f"   Último login: {firebase_user.last_login}")
        
        for pedido in pedidos_firebase:
            print(f"      #{pedido.order_number} - ${pedido.total_amount} - {pedido.status}")
            print(f"         Criado: {pedido.created_at}")
        
    except User.DoesNotExist:
        print(f"   ❌ Usuário Firebase não encontrado")

def verificar_modo_demonstracao_frontend():
    """Verificar se há configurações específicas para modo demo"""
    
    print(f"\n🎭 VERIFICAÇÃO DO MODO DEMONSTRAÇÃO:")
    print("=" * 50)
    
    # Verificar variáveis de ambiente relacionadas a demo
    demo_vars = [
        'PAYSUITE_TEST_MODE',
        'MAX_TEST_AMOUNT',
        'MIN_TEST_AMOUNT',
        'DEBUG',
        'DEV_FIREBASE_ACCEPT_UNVERIFIED'
    ]
    
    for var in demo_vars:
        value = os.getenv(var, 'NÃO DEFINIDA')
        print(f"   {var}: {value}")
    
    # Verificar se há usuários com padrão demo
    demo_patterns = ['demo', 'test', 'guest', 'anonymous']
    
    print(f"\n📊 ESTATÍSTICAS POR PADRÃO DE USUÁRIO:")
    for pattern in demo_patterns:
        count = User.objects.filter(
            Q(username__icontains=pattern) | Q(email__icontains=pattern)
        ).count()
        pedidos_count = Order.objects.filter(
            Q(user__username__icontains=pattern) | Q(user__email__icontains=pattern)
        ).count()
        print(f"   '{pattern}': {count} usuários, {pedidos_count} pedidos")

def listar_todos_pedidos_por_origem():
    """Listar pedidos agrupados por possível origem"""
    
    print(f"\n📋 TODOS OS PEDIDOS AGRUPADOS POR ORIGEM:")
    print("=" * 60)
    
    # Total geral
    total_pedidos = Order.objects.count()
    print(f"   📦 TOTAL GERAL: {total_pedidos} pedidos")
    
    # Por status
    print(f"\n   📊 POR STATUS:")
    from django.db.models import Count
    status_counts = Order.objects.values('status').annotate(count=Count('id')).order_by('-count')
    for stat in status_counts:
        print(f"      {stat['status']}: {stat['count']} pedidos")
    
    # Por usuário (top 10)
    print(f"\n   👥 TOP 10 USUÁRIOS COM MAIS PEDIDOS:")
    user_counts = Order.objects.filter(user__isnull=False).values(
        'user__id', 'user__username', 'user__email'
    ).annotate(count=Count('id')).order_by('-count')[:10]
    
    for user_stat in user_counts:
        print(f"      {user_stat['user__username']} ({user_stat['user__email']}): {user_stat['count']} pedidos")
    
    # Pedidos das últimas 24 horas
    ontem = timezone.now() - timedelta(hours=24)
    pedidos_recentes = Order.objects.filter(created_at__gte=ontem).count()
    print(f"\n   ⏰ ÚLTIMAS 24 HORAS: {pedidos_recentes} pedidos")

if __name__ == '__main__':
    investigar_pedidos_demonstracao()
    verificar_modo_demonstracao_frontend()
    listar_todos_pedidos_por_origem()