#!/usr/bin/env python
"""
Script para adicionar itens aos pedidos existentes que foram criados sem itens.
Este script deve ser executado no servidor após o deploy do código corrigido.
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Order, OrderItem, Payment
from products.models import Product, Color
from decimal import Decimal

def fix_existing_orders():
    """
    Adiciona itens aos pedidos que foram criados sem itens.
    Tenta recuperar informações do carrinho ou do payment.request_data.
    """
    orders_without_items = Order.objects.filter(items__isnull=True).distinct()
    
    print(f"🔍 Encontrados {orders_without_items.count()} pedidos sem itens")
    
    for order in orders_without_items:
        print(f"\n📦 Processando pedido {order.order_number} (ID: {order.id})")
        
        # Tentar obter payment associado
        payment = Payment.objects.filter(order=order).first()
        
        if not payment:
            print(f"  ⚠️  Nenhum payment encontrado para o pedido {order.id}")
            continue
        
        # Verificar se há itens no request_data
        request_data = payment.request_data or {}
        items_data = request_data.get('items', [])
        
        if items_data:
            print(f"  ✅ Encontrados {len(items_data)} itens no payment.request_data")
            created_count = 0
            
            for item_data in items_data:
                try:
                    product_id = item_data.get('product_id') or item_data.get('product')
                    product = None
                    
                    if product_id:
                        try:
                            product = Product.objects.get(id=product_id)
                        except Product.DoesNotExist:
                            print(f"    ⚠️  Produto {product_id} não encontrado")
                    
                    color_id = item_data.get('color_id') or item_data.get('color')
                    color = None
                    
                    if color_id:
                        try:
                            color = Color.objects.get(id=color_id)
                        except Color.DoesNotExist:
                            print(f"    ⚠️  Cor {color_id} não encontrada")
                    
                    # Criar OrderItem
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=item_data.get('name', ''),
                        sku=item_data.get('sku', ''),
                        product_image='',  # Não temos imagem nos dados antigos
                        color=color,
                        color_name=item_data.get('color_name', ''),
                        color_hex='',
                        quantity=int(item_data.get('quantity', 1)),
                        unit_price=Decimal(str(item_data.get('unit_price', item_data.get('price', 0)))),
                        subtotal=Decimal(str(item_data.get('quantity', 1))) * Decimal(str(item_data.get('unit_price', item_data.get('price', 0)))),
                        weight=None,
                        dimensions=''
                    )
                    created_count += 1
                    print(f"    ✅ Item criado: {item_data.get('name', 'Produto')}")
                    
                except Exception as e:
                    print(f"    ❌ Erro ao criar item: {e}")
            
            print(f"  📊 Total de itens criados: {created_count}")
        
        # Fallback: tentar usar o carrinho
        elif payment.cart and payment.cart.items.exists():
            print(f"  🛒 Usando itens do carrinho (fallback)")
            created_count = 0
            
            for cart_item in payment.cart.items.select_related('product', 'color').all():
                try:
                    OrderItem.objects.create(
                        order=order,
                        product=cart_item.product,
                        product_name=cart_item.product.name if cart_item.product else '',
                        sku=getattr(cart_item.product, 'sku', ''),
                        product_image='',
                        color=cart_item.color,
                        color_name=cart_item.color.name if cart_item.color else '',
                        color_hex=getattr(cart_item.color, 'hex_code', '') if cart_item.color else '',
                        quantity=cart_item.quantity,
                        unit_price=cart_item.price,
                        subtotal=cart_item.price * cart_item.quantity,
                        weight=getattr(cart_item.product, 'weight', None) if cart_item.product else None,
                        dimensions=getattr(cart_item.product, 'dimensions', '') if cart_item.product else ''
                    )
                    created_count += 1
                    print(f"    ✅ Item criado do carrinho: {cart_item.product.name if cart_item.product else 'Produto'}")
                    
                except Exception as e:
                    print(f"    ❌ Erro ao criar item do carrinho: {e}")
            
            print(f"  📊 Total de itens criados: {created_count}")
        
        else:
            print(f"  ❌ Não foi possível recuperar itens para este pedido")

if __name__ == '__main__':
    print("🚀 Iniciando correção de pedidos sem itens...\n")
    fix_existing_orders()
    print("\n✅ Correção concluída!")
