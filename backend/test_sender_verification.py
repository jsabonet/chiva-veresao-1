"""
Teste de verificação de sender no Brevo
Tenta enviar email e mostra resposta detalhada da API
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.conf import settings

print("\n" + "="*60)
print("🔍 DIAGNÓSTICO COMPLETO DO SENDER EMAIL")
print("="*60 + "\n")

# Verificar configuração
print("📋 Configuração atual:")
print(f"   Sender Email: {settings.BREVO_SENDER_EMAIL}")
print(f"   Sender Name: {settings.BREVO_SENDER_NAME}")
print(f"   API Key: {settings.BREVO_API_KEY[:20]}...")
print()

# Tentar enviar email de teste
print("📧 Tentando enviar email de teste...\n")

try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
    
    # Configurar API
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = settings.BREVO_API_KEY
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )
    
    # Preparar email de teste
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{
            "email": "jsabonete09@gmail.com",
            "name": "Teste Chiva"
        }],
        sender={
            "email": settings.BREVO_SENDER_EMAIL,
            "name": settings.BREVO_SENDER_NAME
        },
        subject="🧪 Teste de Verificação - Chiva Computer",
        html_content="""
        <html>
            <body style="font-family: Arial; padding: 30px; background: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                    <h1 style="color: #667eea;">✅ Email de Teste</h1>
                    <p>Se você está lendo isso, o sender email está funcionando!</p>
                    <p><strong>Sender:</strong> {sender}</p>
                    <p><strong>Data:</strong> {date}</p>
                </div>
            </body>
        </html>
        """.format(
            sender=settings.BREVO_SENDER_EMAIL,
            date="20/10/2025"
        )
    )
    
    print("📤 Enviando para: jsabonete09@gmail.com")
    print(f"📨 De: {settings.BREVO_SENDER_NAME} <{settings.BREVO_SENDER_EMAIL}>")
    print()
    
    # Enviar
    api_response = api_instance.send_transac_email(send_smtp_email)
    
    print("="*60)
    print("✅ RESPOSTA DA API BREVO:")
    print("="*60)
    print(f"Message ID: {api_response.message_id}")
    print()
    print("✅ EMAIL ACEITO PELO BREVO!")
    print()
    print("⏳ Aguarde 1-2 minutos para o email chegar...")
    print()
    print("🔍 Verifique:")
    print("   1. Caixa de entrada de jsabonete09@gmail.com")
    print("   2. Pasta de SPAM/Lixo Eletrônico")
    print("   3. Dashboard Brevo → Campaigns → Transactional")
    print()
    
except ApiException as e:
    print("="*60)
    print("❌ ERRO DA API BREVO:")
    print("="*60)
    print(f"Status Code: {e.status}")
    print(f"Reason: {e.reason}")
    print(f"Body: {e.body}")
    print()
    
    # Analisar erro
    if "sender" in str(e.body).lower():
        print("⚠️  PROBLEMA DETECTADO: Sender email não verificado!")
        print()
        print("🔧 SOLUÇÃO:")
        print("   1. Acesse: https://app.brevo.com/")
        print("   2. Vá em: Settings → Senders & IP")
        print("   3. Verifique se noreply@chivacomputer.co.mz está na lista")
        print("   4. Se não estiver, clique em 'Add a Sender'")
        print("   5. Adicione o email e verifique")
        print()
        print("   OU use o email da conta:")
        print("   Edite .env → BREVO_SENDER_EMAIL=jsabonete09@gmail.com")
        
    elif "authentication" in str(e.body).lower() or "api" in str(e.body).lower():
        print("⚠️  PROBLEMA DETECTADO: API Key inválida!")
        print()
        print("🔧 SOLUÇÃO:")
        print("   1. Acesse: https://app.brevo.com/")
        print("   2. Vá em: Settings → SMTP & API")
        print("   3. Gere nova API key")
        print("   4. Atualize no .env")
        
    else:
        print("⚠️  Erro desconhecido. Verifique dashboard Brevo.")
        
except Exception as e:
    print(f"❌ Erro inesperado: {e}")
    import traceback
    traceback.print_exc()

print("="*60 + "\n")
