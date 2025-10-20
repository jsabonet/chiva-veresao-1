"""
Teste Simplificado do Sistema de Email
Execute: python test_email_simple.py
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.email_service import get_email_service


def test_send_simple_email():
    """Teste básico de envio de email"""
    print("\n" + "="*60)
    print("  📧 TESTE DE ENVIO DE EMAIL")
    print("="*60 + "\n")
    
    email_service = get_email_service()
    
    # Email de teste simples
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
            <h1 style="margin: 0;">🎉 Email de Teste</h1>
            <p style="margin: 10px 0 0 0;">Sistema de Notificações - Chiva Computer</p>
        </div>
        
        <div style="padding: 30px; background: #ffffff; border: 1px solid #e0e0e0;">
            <h2 style="color: #667eea;">Olá! 👋</h2>
            
            <p>Este é um <strong>email de teste</strong> do sistema de notificações da Chiva Computer.</p>
            
            <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #667eea;">
                <h3 style="margin: 0 0 10px 0; color: #667eea;">✅ Configuração Testada:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>✅ API do Brevo conectada</li>
                    <li>✅ Templates HTML funcionando</li>
                    <li>✅ Emails sendo enviados</li>
                    <li>✅ Sistema 100% operacional</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://chivacomputer.co.mz" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 15px 40px; text-decoration: none; 
                          border-radius: 50px; font-weight: bold;">
                    Visitar Loja
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                Este é um email automático de teste.<br>
                Sistema de notificações por email - Chiva Computer
            </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 20px;">
            <p style="margin: 0; font-size: 14px; color: #666;">
                <strong>Chiva Computer</strong><br>
                A sua loja de confiança em Moçambique<br>
                📍 Maputo | 📧 contato@chivacomputer.co.mz
            </p>
        </div>
    </body>
    </html>
    """
    
    print("🚀 Enviando email de teste...")
    print(f"📧 Para: jsabonete09@gmail.com")
    print(f"📤 De: {email_service.sender_name} <{email_service.sender_email}>")
    print()
    
    try:
        success = email_service._send_email(
            to_email='jsabonete09@gmail.com',
            to_name='João Sabonete',
            subject='🧪 Teste do Sistema de Email - Chiva Computer',
            html_content=html_content
        )
        
        if success:
            print("✅ EMAIL ENVIADO COM SUCESSO!")
            print()
            print("📬 Próximos passos:")
            print("   1. Verifique sua caixa de entrada: jsabonete09@gmail.com")
            print("   2. Se não aparecer, verifique SPAM/Lixo Eletrônico")
            print("   3. Aguarde até 1 minuto (pode demorar um pouco)")
            print()
            print("🎉 Se recebeu o email, o sistema está 100% funcional!")
            print()
            return True
        else:
            print("❌ FALHA AO ENVIAR EMAIL")
            print()
            print("🔧 Possíveis causas:")
            print("   - API Key inválida")
            print("   - Sender email não verificado no Brevo")
            print("   - Limite diário atingido (300 emails/dia)")
            print()
            return False
            
    except Exception as e:
        print(f"❌ ERRO: {e}")
        print()
        print("🔧 Verifique:")
        print("   - Conexão com internet")
        print("   - API Key do Brevo")
        print("   - Configurações no settings.py")
        print()
        return False


if __name__ == '__main__':
    success = test_send_simple_email()
    
    if success:
        print("="*60)
        print()
        print("🎯 PRÓXIMO PASSO:")
        print()
        print("   Se o email foi recebido, você pode testar os outros")
        print("   templates executando:")
        print()
        print("   python manage.py shell")
        print()
        print("   E depois seguir os exemplos em:")
        print("   EXEMPLOS_USO_EMAILS.md")
        print()
        print("="*60)
    
    sys.exit(0 if success else 1)
