"""
Verifica informações dos senders configurados no Brevo
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
print("📧 VERIFICAÇÃO DE SENDERS NO BREVO")
print("="*60 + "\n")

try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
    
    # Configurar API
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = settings.BREVO_API_KEY
    
    # API de Senders
    api_instance = sib_api_v3_sdk.SendersApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )
    
    print("🔍 Buscando senders configurados...\n")
    
    # Listar senders
    api_response = api_instance.get_senders()
    
    if api_response.senders:
        print(f"📋 Encontrados {len(api_response.senders)} sender(s):\n")
        
        for i, sender in enumerate(api_response.senders, 1):
            print(f"{i}. {sender.name} <{sender.email}>")
            print(f"   ID: {sender.id}")
            print(f"   Ativo: {'✅ Sim' if sender.active else '❌ Não'}")
            
            # Verificar se é o sender atual
            if sender.email == settings.BREVO_SENDER_EMAIL:
                print(f"   ⭐ ESTE É O SENDER CONFIGURADO NO .env")
            
            print()
    else:
        print("⚠️  Nenhum sender encontrado!")
        print("   Você precisa adicionar um sender no Brevo.\n")
    
    print("="*60)
    print("\n💡 DICAS:\n")
    
    # Verificar se o sender atual está na lista
    current_sender_found = False
    if api_response.senders:
        for sender in api_response.senders:
            if sender.email == settings.BREVO_SENDER_EMAIL:
                current_sender_found = True
                break
    
    if not current_sender_found:
        print("⚠️  ATENÇÃO: O sender configurado no .env")
        print(f"   ({settings.BREVO_SENDER_EMAIL})")
        print("   NÃO está na lista de senders verificados!\n")
        print("🔧 SOLUÇÃO:")
        print("   1. Acesse: https://app.brevo.com/")
        print("   2. Vá em: Settings → Senders & IP")
        print("   3. Adicione e verifique: " + settings.BREVO_SENDER_EMAIL)
        print("\n   OU use um dos senders verificados acima.\n")
    else:
        print("✅ Sender atual está verificado e ativo!")
        print("\n🔍 Se emails não estão chegando, verifique:")
        print("   1. Pasta SPAM/Lixo Eletrônico")
        print("   2. Dashboard Brevo → Campaigns → Transactional")
        print("   3. Aguarde alguns minutos (pode haver atraso)")
        print("\n   Se domínio chivacomputer.co.mz não tem DNS configurado,")
        print("   emails podem ir para spam. Configure SPF/DKIM/DMARC.\n")
    
except ApiException as e:
    print(f"❌ Erro da API: {e}")
    print(f"\nStatus: {e.status}")
    print(f"Reason: {e.reason}")
    if hasattr(e, 'body'):
        print(f"Body: {e.body}")

except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()

print("="*60 + "\n")
