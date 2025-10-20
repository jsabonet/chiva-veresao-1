"""
Teste completo de todos os templates de email
Envia um email de cada tipo para jsabonete09@gmail.com
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
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

print("\n" + "="*70)
print("🧪 TESTE COMPLETO DE TODOS OS TEMPLATES DE EMAIL")
print("="*70 + "\n")

# Email de destino
test_email = "jsabonete09@gmail.com"
test_name = "João Teste"

email_service = get_email_service()

if not email_service.enabled:
    print("❌ Email service não está habilitado!")
    print("   Verifique as configurações no .env")
    sys.exit(1)

print(f"📧 Todos os emails serão enviados para: {test_email}")
print(f"📨 Sender: {email_service.sender_name} <{email_service.sender_email}>")
print()

# Criar pedido de teste se não existir
print("📦 Preparando dados de teste...")

# Buscar ou criar pedido
order = Order.objects.filter(user__isnull=False).first()

if not order:
    print("⚠️  Nenhum pedido encontrado no banco de dados.")
    print("   Criando pedido de teste...\n")
    
    # Criar usuário de teste se necessário
    from django.contrib.auth.models import User
    user, created = User.objects.get_or_create(
        email=test_email,
        defaults={'username': 'teste_email', 'first_name': 'João', 'last_name': 'Teste'}
    )
    
    # Criar pedido mock
    order = Order.objects.create(
        order_number=f"TEST-{timezone.now().strftime('%Y%m%d%H%M%S')}",
        user=user,
        shipping_address={
            'address': 'Av. Julius Nyerere, 123',
            'city': 'Maputo',
            'province': 'Maputo',
            'phone': '+258 84 123 4567'
        },
        total_amount=Decimal("5500.00"),
        shipping_cost=Decimal("300.00"),
        status="pending"
    )
    
    # Adicionar item de exemplo
    from cart.models import OrderItem
    OrderItem.objects.create(
        order=order,
        product_name="Notebook Dell Inspiron 15",
        color_name="Preto",
        quantity=1,
        unit_price=Decimal("5000.00"),
        subtotal=Decimal("5000.00")
    )
    OrderItem.objects.create(
        order=order,
        product_name="Mouse Wireless Logitech",
        quantity=1,
        unit_price=Decimal("500.00"),
        subtotal=Decimal("500.00")
    )
else:
    print(f"✅ Pedido encontrado: #{order.order_number}\n")

# ============================================================
# TESTE 1: Email de Confirmação de Pedido
# ============================================================
print("="*70)
print("1️⃣  TESTE: Email de Confirmação de Pedido")
print("="*70)
print(f"Template: order_confirmation.html")
print(f"Para: {test_email}")
print()

result1 = email_service.send_order_confirmation(
    order=order,
    customer_email=test_email,
    customer_name=test_name
)

if result1:
    print("✅ Email de confirmação enviado com sucesso!")
else:
    print("❌ Falha ao enviar email de confirmação")
print()

# ============================================================
# TESTE 2: Email de Pagamento Aprovado
# ============================================================
print("="*70)
print("2️⃣  TESTE: Email de Pagamento Aprovado (Verde)")
print("="*70)
print(f"Template: payment_status.html")
print(f"Status: approved")
print()

result2 = email_service.send_payment_status_update(
    order=order,
    customer_email=test_email,
    customer_name=test_name,
    payment_status="approved"
)

if result2:
    print("✅ Email de pagamento aprovado enviado!")
else:
    print("❌ Falha ao enviar")
print()

# ============================================================
# TESTE 3: Email de Pagamento Pendente
# ============================================================
print("="*70)
print("3️⃣  TESTE: Email de Pagamento Pendente (Amarelo)")
print("="*70)
print(f"Template: payment_status.html")
print(f"Status: pending")
print()

result3 = email_service.send_payment_status_update(
    order=order,
    customer_email=test_email,
    customer_name=test_name,
    payment_status="pending"
)

if result3:
    print("✅ Email de pagamento pendente enviado!")
else:
    print("❌ Falha ao enviar")
print()

# ============================================================
# TESTE 4: Email de Pagamento Falhou
# ============================================================
print("="*70)
print("4️⃣  TESTE: Email de Pagamento Falhou (Vermelho)")
print("="*70)
print(f"Template: payment_status.html")
print(f"Status: failed")
print()

result4 = email_service.send_payment_status_update(
    order=order,
    customer_email=test_email,
    customer_name=test_name,
    payment_status="failed"
)

if result4:
    print("✅ Email de pagamento falhou enviado!")
else:
    print("❌ Falha ao enviar")
print()

# ============================================================
# TESTE 5: Email de Envio (com rastreamento)
# ============================================================
print("="*70)
print("5️⃣  TESTE: Email de Pedido Enviado")
print("="*70)
print(f"Template: shipping_update.html")
print(f"Código de rastreamento: ABC123XYZ789")
print()

result5 = email_service.send_shipping_update(
    order=order,
    customer_email=test_email,
    customer_name=test_name,
    tracking_number="ABC123XYZ789"
)

if result5:
    print("✅ Email de envio enviado!")
else:
    print("❌ Falha ao enviar")
print()

# ============================================================
# TESTE 6: Email de Carrinho Abandonado
# ============================================================
print("="*70)
print("6️⃣  TESTE: Email de Carrinho Abandonado")
print("="*70)
print(f"Template: cart_recovery.html")
print()

# Buscar carrinho ou criar mock
cart = Cart.objects.filter(user__isnull=False).first()

if not cart:
    print("⚠️  Criando carrinho mock...")
    # Criar dados mock
    from django.contrib.auth.models import User
    user, created = User.objects.get_or_create(
        email=test_email,
        defaults={'username': 'teste_user'}
    )
    cart = Cart.objects.create(user=user)
    
    # Adicionar items mock
    product = Product.objects.first()
    if product:
        CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=2
        )

result6 = email_service.send_cart_recovery_email(
    cart=cart,
    customer_email=test_email,
    customer_name=test_name,
    recovery_url="https://chivacomputer.co.mz/checkout"
)

if result6:
    print("✅ Email de carrinho abandonado enviado!")
else:
    print("❌ Falha ao enviar")
print()

# ============================================================
# TESTE 7: Email de Notificação Admin
# ============================================================
print("="*70)
print("7️⃣  TESTE: Email de Notificação para Admin")
print("="*70)
print(f"Template: admin_new_order.html")
print(f"Para: {email_service.admin_email}")
print()

result7 = email_service.send_new_order_notification_to_admin(order=order)

if result7:
    print("✅ Email de notificação admin enviado!")
else:
    print("❌ Falha ao enviar")
print()

# ============================================================
# RESUMO FINAL
# ============================================================
print("="*70)
print("📊 RESUMO DOS TESTES")
print("="*70)

results = [
    ("Confirmação de Pedido", result1),
    ("Pagamento Aprovado", result2),
    ("Pagamento Pendente", result3),
    ("Pagamento Falhou", result4),
    ("Pedido Enviado", result5),
    ("Carrinho Abandonado", result6),
    ("Notificação Admin", result7)
]

success_count = sum(1 for _, result in results if result)
total_count = len(results)

print()
for name, result in results:
    status = "✅ ENVIADO" if result else "❌ FALHOU"
    print(f"  {status} - {name}")

print()
print(f"Total: {success_count}/{total_count} emails enviados com sucesso")
print()

if success_count == total_count:
    print("🎉 TODOS OS EMAILS FORAM ENVIADOS COM SUCESSO!")
    print()
    print("📬 Próximos passos:")
    print("   1. Abra seu Gmail: jsabonete09@gmail.com")
    print("   2. Verifique caixa de entrada (devem ter 7 emails)")
    print("   3. Se não estiver, verifique SPAM/Lixo Eletrônico")
    print("   4. Aguarde 1-2 minutos se não apareceu ainda")
    print()
    print("✅ SISTEMA DE EMAILS 100% FUNCIONAL!")
else:
    print("⚠️  Alguns emails falharam. Verifique:")
    print("   1. Configuração do .env")
    print("   2. API Key do Brevo")
    print("   3. Sender email verificado")
    print("   4. Logs do Django console")

print("="*70 + "\n")
