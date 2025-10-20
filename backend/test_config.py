"""
Script de teste rápido para verificar configuração do email
Execute: python test_config.py
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.conf import settings
from cart.email_service import get_email_service


def main():
    print("\n" + "="*60)
    print("  🧪 TESTE DE CONFIGURAÇÃO DO EMAIL SERVICE")
    print("="*60 + "\n")
    
    # Verificar variáveis de ambiente
    print("📋 Variáveis de Ambiente:")
    print(f"  BREVO_API_KEY: {'✅ Configurada' if settings.BREVO_API_KEY else '❌ Não configurada'}")
    if settings.BREVO_API_KEY:
        print(f"    Primeiros 20 chars: {settings.BREVO_API_KEY[:20]}...")
    print(f"  BREVO_SENDER_EMAIL: {settings.BREVO_SENDER_EMAIL}")
    print(f"  BREVO_SENDER_NAME: {settings.BREVO_SENDER_NAME}")
    print(f"  ADMIN_EMAIL: {settings.ADMIN_EMAIL}")
    print(f"  EMAIL_NOTIFICATIONS_ENABLED: {settings.EMAIL_NOTIFICATIONS_ENABLED}")
    
    print("\n" + "-"*60 + "\n")
    
    # Testar EmailService
    print("📧 Email Service:")
    email_service = get_email_service()
    
    print(f"  Habilitado: {email_service.enabled}")
    print(f"  API Key presente: {'✅ Sim' if email_service.api_key else '❌ Não'}")
    if email_service.api_key:
        print(f"    Primeiros 20 chars: {email_service.api_key[:20]}...")
    print(f"  Sender: {email_service.sender_name} <{email_service.sender_email}>")
    print(f"  Admin: {email_service.admin_email}")
    
    print("\n" + "="*60 + "\n")
    
    if email_service.enabled and email_service.api_key:
        print("✅ CONFIGURAÇÃO OK! Pronto para enviar emails de teste.\n")
        print("📧 Para enviar email de teste, execute:")
        print("   python test_email_system.py")
        print("\n⚠️  IMPORTANTE: Edite test_email_system.py e mude")
        print("   'teste@example.com' para SEU EMAIL REAL primeiro!\n")
        return True
    else:
        print("❌ CONFIGURAÇÃO INCOMPLETA!")
        if not email_service.api_key:
            print("\n⚠️  PROBLEMA: API Key do Brevo não foi carregada.")
            print("\n🔧 SOLUÇÃO:")
            print("   1. Verifique se BREVO_API_KEY está no arquivo .env")
            print("   2. Verifique se não há espaços extras")
            print("   3. Reinicie o servidor Django")
            print("   4. Execute este script novamente\n")
        return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
