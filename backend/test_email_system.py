"""
Script de teste para o sistema de notificações por email
Execute: python test_email_system.py
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.email_service import get_email_service
from cart.models import Order, Cart, CartItem
from products.models import Product
from django.contrib.auth.models import User
from decimal import Decimal
from django.utils import timezone


def print_section(title):
    """Imprime uma seção formatada"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60 + "\n")


def test_email_configuration():
    """Testa se o serviço de email está configurado corretamente"""
    print_section("📧 Teste 1: Configuração do Email Service")
    
    email_service = get_email_service()
    
    print(f"✓ Email habilitado: {email_service.enabled}")
    print(f"✓ API Key configurada: {'Sim ✅' if email_service.api_key else 'Não ❌'}")
    print(f"✓ Sender Email: {email_service.sender_email}")
    print(f"✓ Sender Name: {email_service.sender_name}")
    print(f"✓ Admin Email: {email_service.admin_email}")
    
    if not email_service.enabled:
        print("\n⚠️  AVISO: Email notifications estão DESABILITADAS!")
        print("   Configure BREVO_API_KEY no .env para habilitar")
        return False
    
    print("\n✅ Configuração OK!")
    return True


def test_order_confirmation_email():
    """Testa email de confirmação de pedido"""
    print_section("📦 Teste 2: Email de Confirmação de Pedido")
    
    email_service = get_email_service()
    
    # Criar ou buscar usuário de teste
    user, created = User.objects.get_or_create(
        username='test_email',
        defaults={
            'email': 'jsabonete09@gmail.com',  # SEU EMAIL REAL
            'first_name': 'João',
            'last_name': 'Teste'
        }
    )
    
    print(f"✓ Usuário de teste: {user.username} ({user.email})")
    
    # Criar pedido fake
    order = Order(
        id=99999,
        order_number='TEST-2025-001',
        user=user,
        total_amount=Decimal('15000.00'),
        shipping_cost=Decimal('500.00'),
        status='paid',
        shipping_method='express',
        shipping_address={
            'name': 'João Teste Silva',
            'email': 'jsabonete09@gmail.com',  # SEU EMAIL REAL
            'phone': '+258 84 123 4567',
            'address': 'Av. Julius Nyerere, 1234',
            'city': 'Maputo',
            'province': 'Maputo'
        },
        billing_address={},
        customer_notes='Teste de email',
        created_at=timezone.now()
    )
    
    print(f"✓ Pedido de teste criado: #{order.order_number}")
    print(f"✓ Total: {order.total_amount} MZN")
    
    # Simular OrderItems
    from cart.models import OrderItem
    order.items = type('Items', (), {
        'all': lambda: [
            type('Item', (), {
                'product_name': 'Dell Laptop Inspiron 15',
                'color_name': 'Prata',
                'quantity': 1,
                'unit_price': Decimal('12500.00'),
                'subtotal': Decimal('12500.00')
            })(),
            type('Item', (), {
                'product_name': 'Mouse Logitech MX Master 3',
                'color_name': 'Preto',
                'quantity': 2,
                'unit_price': Decimal('1250.00'),
                'subtotal': Decimal('2500.00')
            })()
        ]
    })()
    
    print("\n🚀 Enviando email de confirmação...")
    
    try:
        success = email_service.send_order_confirmation(
            order=order,
            customer_email='jsabonete09@gmail.com',  # SEU EMAIL REAL
            customer_name='João Teste'
        )
        
        if success:
            print("✅ Email de confirmação enviado com sucesso!")
            print("   Verifique sua caixa de entrada: jsabonete09@gmail.com")
        else:
            print("❌ Falha ao enviar email")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao enviar email: {e}")
        return False
    
    return True


def test_payment_status_email():
    """Testa email de status de pagamento"""
    print_section("💳 Teste 3: Email de Status de Pagamento")
    
    email_service = get_email_service()
    
    # Usar mesmo pedido fake
    order = Order(
        id=99999,
        order_number='TEST-2025-001',
        total_amount=Decimal('15000.00'),
        shipping_cost=Decimal('500.00'),
        status='paid',
        shipping_method='express',
        shipping_address={
            'name': 'João Teste',
            'email': 'jsabonete09@gmail.com',  # SEU EMAIL REAL
        },
        created_at=timezone.now()
    )
    
    print("🚀 Enviando email de pagamento APROVADO...")
    
    try:
        success = email_service.send_payment_status_update(
            order=order,
            payment_status='paid',
            customer_email='jsabonete09@gmail.com',  # SEU EMAIL REAL
            customer_name='João Teste'
        )
        
        if success:
            print("✅ Email de status enviado com sucesso!")
        else:
            print("❌ Falha ao enviar email")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao enviar email: {e}")
        return False
    
    return True


def test_cart_recovery_email():
    """Testa email de recuperação de carrinho"""
    print_section("🛒 Teste 4: Email de Recuperação de Carrinho")
    
    email_service = get_email_service()
    
    # Criar carrinho fake
    user, _ = User.objects.get_or_create(
        username='test_email',
        defaults={'email': 'jsabonete09@gmail.com'}
    )
    
    cart = Cart(
        id=99999,
        user=user,
        total=Decimal('8500.00'),
        subtotal=Decimal('8500.00'),
        status='abandoned',
        recovery_token='test-token-123'
    )
    
    # Simular items no carrinho
    cart.items = type('Items', (), {
        'all': lambda: [
            type('Item', (), {
                'product': type('Product', (), {'name': 'Teclado Mecânico RGB'})(),
                'quantity': 1,
                'price': Decimal('3500.00')
            })(),
            type('Item', (), {
                'product': type('Product', (), {'name': 'Webcam Logitech C920'})(),
                'quantity': 1,
                'price': Decimal('5000.00')
            })()
        ],
        'count': lambda: 2
    })()
    
    recovery_url = f"https://chivacomputer.co.mz/carrinho?recovery={cart.recovery_token}"
    
    print(f"✓ Carrinho: {cart.items.count()} items")
    print(f"✓ Total: {cart.total} MZN")
    print(f"✓ Recovery URL: {recovery_url}")
    
    print("\n🚀 Enviando email de recuperação...")
    
    try:
        success = email_service.send_cart_recovery_email(
            cart=cart,
            customer_email='jsabonete09@gmail.com',  # SEU EMAIL REAL
            customer_name='João Teste',
            recovery_url=recovery_url
        )
        
        if success:
            print("✅ Email de recuperação enviado com sucesso!")
        else:
            print("❌ Falha ao enviar email")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao enviar email: {e}")
        return False
    
    return True


def test_admin_notification():
    """Testa email de notificação para admin"""
    print_section("👨‍💼 Teste 5: Email de Notificação para Admin")
    
    email_service = get_email_service()
    
    # Criar pedido fake
    order = Order(
        id=99999,
        order_number='TEST-2025-001',
        total_amount=Decimal('15000.00'),
        shipping_cost=Decimal('500.00'),
        status='paid',
        shipping_method='express',
        shipping_address={
            'name': 'João Teste Silva',
            'email': 'teste@example.com',
            'phone': '+258 84 123 4567',
            'address': 'Av. Julius Nyerere, 1234',
            'city': 'Maputo',
            'province': 'Maputo'
        },
        created_at=timezone.now()
    )
    
    # Simular OrderItems
    from cart.models import OrderItem
    order.items = type('Items', (), {
        'all': lambda: [
            type('Item', (), {
                'product_name': 'Dell Laptop Inspiron 15',
                'quantity': 1,
                'subtotal': Decimal('12500.00')
            })(),
            type('Item', (), {
                'product_name': 'Mouse Logitech',
                'quantity': 2,
                'subtotal': Decimal('2500.00')
            })()
        ]
    })()
    
    print(f"✓ Pedido: #{order.order_number}")
    print(f"✓ Total: {order.total_amount} MZN")
    print(f"✓ Admin email: {email_service.admin_email}")
    
    print("\n🚀 Enviando notificação para admin...")
    
    try:
        success = email_service.send_new_order_notification_to_admin(order=order)
        
        if success:
            print("✅ Email para admin enviado com sucesso!")
            print(f"   Verifique: {email_service.admin_email}")
        else:
            print("❌ Falha ao enviar email")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao enviar email: {e}")
        return False
    
    return True


def main():
    """Executa todos os testes"""
    print("\n" + "="*60)
    print("  🧪 TESTE DO SISTEMA DE NOTIFICAÇÕES POR EMAIL")
    print("  Chiva Computer - Email Service Test Suite")
    print("="*60)
    
    print("\n⚠️  IMPORTANTE: Antes de executar, configure:")
    print("   1. BREVO_API_KEY no arquivo .env")
    print("   2. Emails configurados para: jsabonete09@gmail.com")
    print("\n")
    
    input("Pressione ENTER para continuar...")
    
    results = []
    
    # Teste 1: Configuração
    results.append(("Configuração", test_email_configuration()))
    
    if not results[0][1]:
        print("\n❌ Testes abortados: Email service não está configurado")
        return
    
    # Teste 2: Confirmação de pedido
    results.append(("Confirmação de Pedido", test_order_confirmation_email()))
    
    # Teste 3: Status de pagamento
    results.append(("Status de Pagamento", test_payment_status_email()))
    
    # Teste 4: Recuperação de carrinho
    results.append(("Recuperação de Carrinho", test_cart_recovery_email()))
    
    # Teste 5: Notificação admin
    results.append(("Notificação Admin", test_admin_notification()))
    
    # Resumo
    print_section("📊 RESUMO DOS TESTES")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASSOU" if success else "❌ FALHOU"
        print(f"{status} - {test_name}")
    
    print(f"\n🎯 Resultado: {passed}/{total} testes passaram")
    
    if passed == total:
        print("\n🎉 Todos os testes passaram! Sistema de email está funcionando perfeitamente!")
    else:
        print("\n⚠️  Alguns testes falharam. Verifique os logs acima.")


if __name__ == '__main__':
    main()
