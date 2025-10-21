#!/usr/bin/env python
"""
Script de Diagnóstico Completo do Sistema de Emails em Produção
Verifica todas as configurações e tenta enviar um email de teste
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.conf import settings
from cart.models import Order
from cart.email_service import get_email_service
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

print("=" * 80)
print("🔍 DIAGNÓSTICO COMPLETO DO SISTEMA DE EMAILS EM PRODUÇÃO")
print("=" * 80)
print()

# ============================================
# 1. VERIFICAR VARIÁVEIS DE AMBIENTE
# ============================================
print("1️⃣ VERIFICANDO VARIÁVEIS DE AMBIENTE")
print("-" * 80)

env_vars = {
    'BREVO_API_KEY': getattr(settings, 'BREVO_API_KEY', None),
    'BREVO_SENDER_EMAIL': getattr(settings, 'BREVO_SENDER_EMAIL', None),
    'BREVO_SENDER_NAME': getattr(settings, 'BREVO_SENDER_NAME', None),
    'ADMIN_EMAIL': getattr(settings, 'ADMIN_EMAIL', None),
    'EMAIL_NOTIFICATIONS_ENABLED': getattr(settings, 'EMAIL_NOTIFICATIONS_ENABLED', None),
    'SEND_ORDER_CONFIRMATION': getattr(settings, 'SEND_ORDER_CONFIRMATION', None),
    'SEND_PAYMENT_STATUS': getattr(settings, 'SEND_PAYMENT_STATUS', None),
    'SEND_SHIPPING_UPDATES': getattr(settings, 'SEND_SHIPPING_UPDATES', None),
}

all_ok = True
for key, value in env_vars.items():
    status = "✅" if value else "❌"
    if not value and key.startswith('SEND_'):
        status = "⚠️"
    print(f"{status} {key}: {value}")
    if not value and key in ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL']:
        all_ok = False

print()

if not all_ok:
    print("❌ ERRO CRÍTICO: Variáveis essenciais estão faltando!")
    print("   Configure BREVO_API_KEY e BREVO_SENDER_EMAIL no .env")
    sys.exit(1)

# ============================================
# 2. VERIFICAR BREVO API
# ============================================
print("2️⃣ TESTANDO CONEXÃO COM BREVO API")
print("-" * 80)

try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
    
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = settings.BREVO_API_KEY
    
    api_instance = sib_api_v3_sdk.AccountApi(sib_api_v3_sdk.ApiClient(configuration))
    account_info = api_instance.get_account()
    
    print(f"✅ Conexão com Brevo OK!")
    print(f"   Email da conta: {account_info.email}")
    print(f"   Plano: {account_info.plan[0]['type'] if account_info.plan else 'Unknown'}")
    
    # Verificar créditos
    if hasattr(account_info, 'plan') and account_info.plan:
        plan = account_info.plan[0]
        if 'credits' in plan:
            print(f"   Créditos: {plan['credits']}")
    
except Exception as e:
    print(f"❌ ERRO ao conectar com Brevo API: {e}")
    print("   Verifique se o BREVO_API_KEY está correto")
    all_ok = False

print()

# ============================================
# 3. VERIFICAR TEMPLATES DE EMAIL
# ============================================
print("3️⃣ VERIFICANDO TEMPLATES DE EMAIL")
print("-" * 80)

from pathlib import Path

templates_dir = Path(settings.BASE_DIR) / 'cart' / 'email_templates'
templates = [
    'order_confirmation.html',
    'payment_status.html',
    'shipping_update.html',
    'cart_recovery.html',
    'admin_new_order.html'
]

for template in templates:
    template_path = templates_dir / template
    if template_path.exists():
        print(f"✅ {template} - OK")
    else:
        print(f"❌ {template} - NÃO ENCONTRADO")
        all_ok = False

print()

# ============================================
# 4. VERIFICAR PEDIDOS RECENTES
# ============================================
print("4️⃣ VERIFICANDO PEDIDOS RECENTES")
print("-" * 80)

recent_orders = Order.objects.all().order_by('-created_at')[:5]

if recent_orders.exists():
    print(f"📦 Encontrados {recent_orders.count()} pedidos recentes:")
    for order in recent_orders:
        email = order.shipping_address.get('email', 'N/A') if order.shipping_address else 'N/A'
        print(f"   • Pedido #{order.order_number} - Status: {order.status} - Email: {email}")
else:
    print("⚠️ Nenhum pedido encontrado no sistema")

print()

# ============================================
# 5. TESTE DE ENVIO DE EMAIL
# ============================================
print("5️⃣ TESTE DE ENVIO DE EMAIL")
print("-" * 80)

if recent_orders.exists():
    test_order = recent_orders.first()
    test_email = input(f"\n📧 Digite o email para teste (ou ENTER para usar o email do pedido): ").strip()
    
    if not test_email:
        test_email = test_order.shipping_address.get('email', '') if test_order.shipping_address else ''
    
    if not test_email:
        test_email = input("📧 Email não encontrado no pedido. Digite um email válido: ").strip()
    
    if test_email:
        print(f"\n🚀 Enviando email de teste para: {test_email}")
        print(f"   Pedido: #{test_order.order_number}")
        print(f"   Status: {test_order.status}")
        
        try:
            email_service = get_email_service()
            
            # Obter nome do cliente
            customer_name = test_order.shipping_address.get('name', 'Cliente') if test_order.shipping_address else 'Cliente'
            
            print(f"\n📨 Tentando enviar confirmação de pedido...")
            result = email_service.send_order_confirmation(
                order=test_order,
                customer_email=test_email,
                customer_name=customer_name
            )
            
            if result:
                print(f"✅ EMAIL ENVIADO COM SUCESSO!")
                print(f"   Verifique a caixa de entrada (ou spam) de: {test_email}")
            else:
                print(f"❌ FALHA AO ENVIAR EMAIL")
                print(f"   Verifique os logs acima para mais detalhes")
                
        except Exception as e:
            print(f"❌ ERRO ao enviar email: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("⚠️ Nenhum email fornecido. Pulando teste de envio.")
else:
    print("⚠️ Não há pedidos para testar. Crie um pedido primeiro.")

print()

# ============================================
# 6. VERIFICAR LOGS DO WEBHOOK
# ============================================
print("6️⃣ VERIFICANDO ÚLTIMOS EVENTOS DE PAGAMENTO")
print("-" * 80)

from cart.models import Payment

recent_payments = Payment.objects.all().order_by('-created_at')[:10]

if recent_payments.exists():
    print(f"💳 Encontrados {recent_payments.count()} pagamentos recentes:")
    for payment in recent_payments:
        order_num = payment.order.order_number if payment.order else 'SEM PEDIDO'
        print(f"   • Payment ID: {payment.id} - Status: {payment.status} - Order: {order_num}")
        if payment.raw_response:
            print(f"     Último evento: {payment.raw_response.get('event', 'N/A')}")
else:
    print("⚠️ Nenhum pagamento encontrado")

print()

# ============================================
# 7. RESUMO E RECOMENDAÇÕES
# ============================================
print("=" * 80)
print("📋 RESUMO DO DIAGNÓSTICO")
print("=" * 80)

if all_ok:
    print("✅ SISTEMA CONFIGURADO CORRETAMENTE!")
    print()
    print("🔍 POSSÍVEIS CAUSAS PARA NÃO RECEBER EMAILS:")
    print()
    print("1. ⏱️ DELAY NO ENVIO")
    print("   • Brevo pode demorar alguns minutos para entregar")
    print("   • Verifique https://app.brevo.com/ → Transactional → Logs")
    print()
    print("2. 📧 EMAILS NA PASTA DE SPAM")
    print("   • Verifique a pasta de spam/lixo eletrônico")
    print("   • Marque emails da Chiva Computer como 'Não spam'")
    print()
    print("3. 🚫 WEBHOOK NÃO ESTÁ SENDO CHAMADO")
    print("   • Verifique se o PaySuite está configurado corretamente")
    print("   • URL do webhook deve ser: https://chivacomputer.co.mz/api/cart/payments/webhook/")
    print("   • Verifique logs do servidor em produção")
    print()
    print("4. 🔒 SENDER NÃO VERIFICADO")
    print("   • Sender atual: chivacomputer@gmail.com")
    print("   • Verifique se está verificado em: https://app.brevo.com/senders")
    print()
    print("5. 📊 VERIFICAR LOGS EM PRODUÇÃO")
    print("   • SSH no servidor e execute:")
    print("   • tail -f /var/log/nginx/error.log")
    print("   • docker logs <container_name> --tail 100")
    print()
else:
    print("❌ PROBLEMAS ENCONTRADOS NA CONFIGURAÇÃO!")
    print("   Corrija os erros acima antes de continuar")

print()
print("=" * 80)
print("✅ DIAGNÓSTICO COMPLETO")
print("=" * 80)
