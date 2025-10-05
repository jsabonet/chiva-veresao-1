#!/usr/bin/env python
"""
Diagrama das relações entre tabelas de pedidos
"""

import os
import sys
import django

# Configurar Django
sys.path.append('/d/Projectos/versao_1_chiva/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Order, Payment
from django.contrib.auth.models import User

def mostrar_diagrama_relacoes():
    """Mostrar diagrama das relações entre tabelas"""
    
    print("🏗️ DIAGRAMA DE RELAÇÕES - SISTEMA DE PEDIDOS")
    print("=" * 60)
    
    print("""
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DE DADOS                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐       ┌─────────────────┐              │
│  │   auth_user     │       │   cart_order    │              │
│  │                 │       │                 │              │
│  │ • id (PK)       │◄──────┤ • id (PK)       │              │
│  │ • email         │       │ • user_id (FK)  │              │
│  │ • username      │       │ • order_number  │              │
│  │ • ...           │       │ • total_amount  │              │
│  └─────────────────┘       │ • status        │              │
│                            │ • created_at    │              │
│                            │ • updated_at    │              │
│                            │ • shipping_*    │              │
│                            │ • billing_*     │              │
│                            └─────────────────┘              │
│                                    │                        │
│                                    │ 1:N                    │
│                                    ▼                        │
│                            ┌─────────────────┐              │
│                            │  cart_payment   │              │
│                            │                 │              │
│                            │ • id (PK)       │              │
│                            │ • order_id (FK) │              │
│                            │ • method        │              │
│                            │ • amount        │              │
│                            │ • status        │              │
│                            │ • currency      │              │
│                            │ • paysuite_ref  │              │
│                            │ • raw_response  │              │
│                            │ • created_at    │              │
│                            │ • updated_at    │              │
│                            └─────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
    """)

def mostrar_fluxo_pedido():
    """Mostrar fluxo de estados do pedido"""
    
    print("\n🔄 FLUXO DE ESTADOS DOS PEDIDOS")
    print("=" * 50)
    
    print("""
┌─────────────────────────────────────────────────────────────┐
│                     CICLO DE VIDA DO PEDIDO                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [CRIAÇÃO]                                                 │
│       │                                                     │
│       ▼                                                     │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│   │ pending │────▶│  paid   │────▶│shipped  │              │
│   └─────────┘     └─────────┘     └─────────┘              │
│       │               │               │                     │
│       │               │               ▼                     │
│       │               │           ┌─────────┐              │
│       │               │           │delivered│              │
│       │               │           └─────────┘              │
│       │               │                                     │
│       ▼               ▼                                     │
│   ┌─────────┐     ┌─────────┐                              │
│   │cancelled│     │refunded │                              │
│   └─────────┘     └─────────┘                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
    """)

def mostrar_campos_importantes():
    """Mostrar campos importantes e suas funções"""
    
    print("\n📋 CAMPOS IMPORTANTES - cart_order")
    print("=" * 50)
    
    campos_order = [
        ("id", "Chave primária única do pedido"),
        ("order_number", "Número do pedido visível ao cliente (CHV202510030085)"),
        ("user_id", "Referência para o usuário que fez o pedido"),
        ("total_amount", "Valor total do pedido"),
        ("status", "Estado atual: pending, paid, shipped, delivered, cancelled, refunded"),
        ("shipping_address", "Endereço de entrega (formato JSON)"),
        ("billing_address", "Endereço de cobrança (formato JSON)"),
        ("shipping_method", "Método de envio: standard, express, etc."),
        ("shipping_cost", "Custo do frete"),
        ("tracking_number", "Número de rastreamento (opcional)"),
        ("estimated_delivery", "Data estimada de entrega"),
        ("delivered_at", "Data/hora efetiva da entrega"),
        ("notes", "Notas internas do pedido"),
        ("customer_notes", "Observações do cliente"),
        ("created_at", "Data/hora de criação"),
        ("updated_at", "Data/hora da última atualização")
    ]
    
    for campo, descricao in campos_order:
        print(f"   {campo:<20}: {descricao}")
    
    print("\n💳 CAMPOS IMPORTANTES - cart_payment")
    print("=" * 50)
    
    campos_payment = [
        ("id", "Chave primária única do pagamento"),
        ("order_id", "Referência para o pedido (FK)"),
        ("method", "Método de pagamento: mpesa, visa, paypal, etc."),
        ("amount", "Valor do pagamento"),
        ("currency", "Moeda (MZN, USD, etc.)"),
        ("status", "Estado: pending, paid, failed, refunded"),
        ("paysuite_reference", "Referência do PaySuite (se aplicável)"),
        ("raw_response", "Resposta completa da API de pagamento (JSON)"),
        ("created_at", "Data/hora de criação"),
        ("updated_at", "Data/hora da última atualização")
    ]
    
    for campo, descricao in campos_payment:
        print(f"   {campo:<20}: {descricao}")

def mostrar_estatisticas_atuais():
    """Mostrar estatísticas atuais do sistema"""
    
    print("\n📊 ESTATÍSTICAS ATUAIS DO SISTEMA")
    print("=" * 50)
    
    # Contar pedidos por status
    from django.db.models import Count, Sum
    
    stats_pedidos = Order.objects.values('status').annotate(count=Count('id')).order_by('-count')
    total_pedidos = Order.objects.count()
    receita_total = Order.objects.filter(status='paid').aggregate(Sum('total_amount'))['total_amount__sum'] or 0
    
    print(f"   📦 Total de pedidos: {total_pedidos}")
    print(f"   💰 Receita (pedidos pagos): ${receita_total}")
    print(f"   📈 Distribuição por status:")
    
    for stat in stats_pedidos:
        percentage = (stat['count'] / total_pedidos * 100) if total_pedidos > 0 else 0
        print(f"      {stat['status']:<12}: {stat['count']:>3} pedidos ({percentage:>5.1f}%)")
    
    # Estatísticas de pagamentos
    stats_pagamentos = Payment.objects.values('status').annotate(count=Count('id')).order_by('-count')
    total_pagamentos = Payment.objects.count()
    
    print(f"\n   💳 Total de pagamentos: {total_pagamentos}")
    print(f"   📊 Distribuição por status:")
    
    for stat in stats_pagamentos:
        percentage = (stat['count'] / total_pagamentos * 100) if total_pagamentos > 0 else 0
        print(f"      {stat['status']:<12}: {stat['count']:>3} pagamentos ({percentage:>5.1f}%)")

if __name__ == '__main__':
    mostrar_diagrama_relacoes()
    mostrar_fluxo_pedido()
    mostrar_campos_importantes()
    mostrar_estatisticas_atuais()