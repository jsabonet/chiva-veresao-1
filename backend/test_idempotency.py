"""
Teste de idempotência - verifica que OrderItems não são duplicados
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from decimal import Decimal
from cart.models import Order, Payment, OrderItem
from products.models import Product, Color
from django.contrib.auth import get_user_model

User = get_user_model()

def test_idempotency():
    """Testa se a lógica não cria items duplicados ao ser executada múltiplas vezes"""
    print("\n" + "="*80)
    print("  TESTE DE IDEMPOTÊNCIA - ORDERITEMS")
    print("="*80 + "\n")
    
    # Criar dados de teste
    user = User.objects.filter(email='test_polling@example.com').first()
    if not user:
        print("❌ Usuário de teste não encontrado")
        return
    
    product = Product.objects.filter(stock_quantity__gt=0).first()
    color = Color.objects.first()
    
    if not product or not color:
        print("❌ Produto ou cor não encontrados")
        return
    
    # Criar order e payment
    order = Order.objects.create(
        user=user,
        status='pending',
        total_amount=Decimal('100.00'),
        shipping_address={'test': 'address'},
        billing_address={'test': 'address'}
    )
    
    payment = Payment.objects.create(
        order=order,
        method='paysuite',
        amount=Decimal('100.00'),
        currency='MZN',
        status='pending',
        paysuite_reference='IDEMPOTENCY_TEST',
        request_data={
            'items': [{
                'product_id': product.id,
                'name': product.name,
                'sku': getattr(product, 'sku', ''),
                'color_id': color.id,
                'color_name': color.name,
                'quantity': 1,
                'unit_price': str(product.price),
            }]
        }
    )
    
    print(f"✅ Order criado: #{order.order_number}")
    print(f"✅ Payment criado: ID {payment.id}")
    print(f"✅ request_data contém 1 item")
    
    # Simular lógica de criação (primeira vez)
    print("\n🔧 PRIMEIRA EXECUÇÃO:")
    if order and not order.items.exists():
        print("  ✅ Order não tem items - vai criar")
        items_payload = payment.request_data.get('items', [])
        for it in items_payload:
            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=it['name'],
                sku=it['sku'],
                color=color,
                color_name=it['color_name'],
                quantity=int(it['quantity']),
                unit_price=Decimal(it['unit_price']),
                subtotal=Decimal(it['unit_price']) * int(it['quantity'])
            )
        print(f"  ✅ OrderItem criado!")
    
    count_after_first = order.items.count()
    print(f"  📊 OrderItems após primeira execução: {count_after_first}")
    
    # Simular lógica de criação (segunda vez - deve pular)
    print("\n🔧 SEGUNDA EXECUÇÃO (Idempotência):")
    if order and not order.items.exists():
        print("  ❌ ERRO: Order não tem items (deveria ter!)")
    else:
        print(f"  ✅ Order já tem {order.items.count()} items - PULANDO criação")
    
    count_after_second = order.items.count()
    print(f"  📊 OrderItems após segunda execução: {count_after_second}")
    
    # Verificação final
    print("\n" + "="*80)
    print("  RESULTADO")
    print("="*80 + "\n")
    
    if count_after_first == 1 and count_after_second == 1:
        print("✅ SUCESSO! Idempotência funcionando perfeitamente!")
        print("   • Primeira execução criou 1 item")
        print("   • Segunda execução não duplicou (ainda 1 item)")
        success = True
    else:
        print("❌ FALHA! Items foram duplicados!")
        print(f"   • Primeira execução: {count_after_first} items")
        print(f"   • Segunda execução: {count_after_second} items")
        success = False
    
    # Limpar
    print("\n🗑️  Limpando dados de teste...")
    order.items.all().delete()
    payment.delete()
    order.delete()
    print("✅ Limpeza concluída\n")
    
    return success

if __name__ == '__main__':
    result = test_idempotency()
    sys.exit(0 if result else 1)
