#!/usr/bin/env python
"""
Verificar se Brevo está realmente enviando emails
Testar diretamente a API do Brevo
"""
import os
import django
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.conf import settings
import requests
import json

def testar_brevo_api():
    """Testar API do Brevo diretamente"""
    
    print("\n" + "="*80)
    print("📧 TESTANDO API DO BREVO DIRETAMENTE")
    print("="*80)
    
    # Verificar configuração
    api_key = getattr(settings, 'BREVO_API_KEY', None)
    sender_email = getattr(settings, 'BREVO_SENDER_EMAIL', None)
    sender_name = getattr(settings, 'BREVO_SENDER_NAME', 'Chiva Computer')
    
    print(f"\n🔧 Configuração:")
    print(f"   API Key: {api_key[:20]}..." if api_key else "   ❌ API Key não configurado")
    print(f"   Sender Email: {sender_email}")
    print(f"   Sender Name: {sender_name}")
    
    if not api_key or not sender_email:
        print(f"\n❌ Configuração incompleta!")
        return False
    
    # Preparar email de teste
    test_email = {
        "sender": {
            "name": sender_name,
            "email": sender_email
        },
        "to": [
            {
                "email": "jsabonete09@gmail.com",
                "name": "João Teste"
            }
        ],
        "subject": "🧪 Teste de Email do Sistema de Pedidos",
        "htmlContent": """
        <html>
        <head></head>
        <body>
            <h1>Teste de Email</h1>
            <p>Este é um email de teste do sistema de pedidos.</p>
            <p>Se você recebeu este email, significa que o sistema está funcionando corretamente!</p>
            <hr>
            <p style="font-size: 12px; color: gray;">
                Enviado em: {timestamp}<br>
                Sistema: Chiva Computer<br>
                Teste: API Brevo
            </p>
        </body>
        </html>
        """.replace("{timestamp}", str(__import__('datetime').datetime.now()))
    }
    
    # Enviar via API Brevo
    print(f"\n📡 Enviando email de teste...")
    
    try:
        headers = {
            'accept': 'application/json',
            'api-key': api_key,
            'content-type': 'application/json'
        }
        
        response = requests.post(
            'https://api.brevo.com/v3/smtp/email',
            headers=headers,
            json=test_email,
            timeout=10
        )
        
        print(f"✅ Response Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"\n🎉 EMAIL ENVIADO COM SUCESSO!")
            print(f"   Message ID: {data.get('messageId', 'N/A')}")
            print(f"\n💡 Verifique a caixa de entrada de: jsabonete09@gmail.com")
            print(f"   Assunto: '🧪 Teste de Email do Sistema de Pedidos'")
            print(f"   Pode demorar alguns segundos para chegar")
            return True
        else:
            print(f"\n❌ Erro ao enviar email!")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ Exceção ao enviar email: {e}")
        import traceback
        traceback.print_exc()
        return False

def testar_email_service():
    """Testar através do email_service.py"""
    
    print("\n" + "="*80)
    print("📧 TESTANDO EMAIL SERVICE INTERNO")
    print("="*80)
    
    try:
        from cart.email_service import get_email_service
        from cart.models import Order
        
        email_service = get_email_service()
        
        # Pegar um order recente para teste
        order = Order.objects.filter(
            shipping_address__email='jsabonete09@gmail.com'
        ).order_by('-id').first()
        
        if not order:
            print(f"\n⚠️ Nenhum order encontrado com o email jsabonete09@gmail.com")
            return False
        
        print(f"\n📦 Usando Order #{order.id} para teste")
        print(f"   Email: {order.shipping_address.get('email', 'N/A')}")
        
        # Enviar email de teste
        print(f"\n📡 Enviando email de status 'failed'...")
        
        result = email_service.send_payment_status_update(
            order=order,
            payment_status='failed',
            customer_email='jsabonete09@gmail.com',
            customer_name='João Teste'
        )
        
        print(f"\n✅ Resultado: {result}")
        
        if result:
            print(f"\n🎉 EMAIL ENVIADO COM SUCESSO VIA EMAIL SERVICE!")
            print(f"   Verifique: jsabonete09@gmail.com")
            return True
        else:
            print(f"\n❌ Falha ao enviar via email service")
            return False
            
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def verificar_quota_brevo():
    """Verificar quota da API Brevo"""
    
    print("\n" + "="*80)
    print("📊 VERIFICANDO QUOTA DO BREVO")
    print("="*80)
    
    api_key = getattr(settings, 'BREVO_API_KEY', None)
    
    if not api_key:
        print(f"\n❌ API Key não configurado")
        return
    
    try:
        headers = {
            'accept': 'application/json',
            'api-key': api_key
        }
        
        response = requests.get(
            'https://api.brevo.com/v3/account',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"\n✅ Conta Brevo:")
            print(f"   Email: {data.get('email', 'N/A')}")
            print(f"   Plan: {data.get('plan', [{}])[0].get('type', 'N/A') if data.get('plan') else 'N/A'}")
            
            # Verificar limites
            if 'plan' in data and data['plan']:
                plan = data['plan'][0]
                print(f"\n📊 Limites:")
                print(f"   Emails/dia: {plan.get('credits', 'N/A')}")
                print(f"   Usado hoje: {plan.get('creditsUsed', 'N/A')}")
        else:
            print(f"\n⚠️ Não foi possível verificar quota")
            print(f"   Status: {response.status_code}")
            
    except Exception as e:
        print(f"\n❌ Erro: {e}")

def main():
    print("\n🚀 DIAGNÓSTICO COMPLETO DO SISTEMA DE EMAILS\n")
    
    # 1. Testar Brevo API diretamente
    test1 = testar_brevo_api()
    
    # 2. Verificar quota
    verificar_quota_brevo()
    
    # 3. Testar email service
    test2 = testar_email_service()
    
    # Resumo
    print("\n" + "="*80)
    print("📋 RESUMO DOS TESTES")
    print("="*80)
    
    print(f"\n{'✅' if test1 else '❌'} Teste 1: Brevo API Direta")
    print(f"{'✅' if test2 else '❌'} Teste 2: Email Service Interno")
    
    if test1 and test2:
        print(f"\n✅ SISTEMA DE EMAILS 100% FUNCIONAL!")
        print(f"\n💡 Se usuário não recebe emails, verifique:")
        print(f"   1. Caixa de SPAM")
        print(f"   2. Email correto no checkout")
        print(f"   3. Provedor de email (alguns bloqueiam)")
    else:
        print(f"\n⚠️ Problemas detectados!")
        print(f"   Verifique configuração do Brevo")
    
    print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    main()
