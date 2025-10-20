"""
Teste dos Templates HTML de Email
Testa se os templates estão carregando e renderizando corretamente
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from pathlib import Path

def test_templates():
    """Verifica se todos os templates existem e são válidos"""
    
    templates_dir = Path(__file__).parent / 'cart' / 'email_templates'
    
    templates = [
        'order_confirmation.html',
        'payment_status.html',
        'shipping_update.html',
        'cart_recovery.html',
        'admin_new_order.html'
    ]
    
    print("\n" + "="*60)
    print("🧪 TESTE DOS TEMPLATES HTML")
    print("="*60 + "\n")
    
    all_ok = True
    
    for template_name in templates:
        template_path = templates_dir / template_name
        
        if template_path.exists():
            # Verificar se consegue ler
            try:
                with open(template_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    size_kb = len(content) / 1024
                    
                    # Contar variáveis
                    import re
                    variables = re.findall(r'\{\{([A-Z_]+)\}\}', content)
                    unique_vars = set(variables)
                    
                    print(f"✅ {template_name}")
                    print(f"   📁 Tamanho: {size_kb:.2f} KB")
                    print(f"   📝 Variáveis: {len(unique_vars)}")
                    print(f"   🔤 {', '.join(sorted(unique_vars)[:5])}...")
                    print()
            except Exception as e:
                print(f"❌ {template_name} - Erro ao ler: {e}")
                all_ok = False
        else:
            print(f"❌ {template_name} - NÃO ENCONTRADO")
            all_ok = False
    
    print("="*60)
    if all_ok:
        print("✅ TODOS OS TEMPLATES ESTÃO OK!")
    else:
        print("❌ ALGUNS TEMPLATES TÊM PROBLEMAS")
    print("="*60 + "\n")
    
    return all_ok


def test_template_rendering():
    """Testa renderização de template com dados de exemplo"""
    
    print("\n" + "="*60)
    print("🎨 TESTE DE RENDERIZAÇÃO")
    print("="*60 + "\n")
    
    # Import da nova versão do email service
    from cart.email_service_v2 import EmailService
    
    service = EmailService()
    
    # Teste 1: Carregar template
    print("📋 Teste 1: Carregando template order_confirmation.html...")
    template = service._load_template('order_confirmation.html')
    
    if template:
        print(f"✅ Template carregado ({len(template)} caracteres)")
    else:
        print("❌ Falha ao carregar template")
        return False
    
    # Teste 2: Renderizar com contexto
    print("\n📋 Teste 2: Renderizando com dados de exemplo...")
    
    context = {
        'CUSTOMER_NAME': 'João Silva',
        'ORDER_NUMBER': 'CHV-12345',
        'ORDER_DATE': '01/01/2024 às 10:30',
        'ORDER_STATUS': 'Confirmado',
        'ORDER_ITEMS': '<tr><td>Produto Teste</td><td>1</td><td>100 MZN</td><td>100 MZN</td></tr>',
        'SUBTOTAL': '100.00',
        'SHIPPING_COST': '50.00',
        'TOTAL_AMOUNT': '150.00',
        'SHIPPING_ADDRESS': 'Av. 25 de Setembro, Maputo',
        'PAYMENT_METHOD': 'M-PESA'
    }
    
    rendered = service._render_template(template, context)
    
    # Verificar se variáveis foram substituídas
    remaining_vars = rendered.count('{{')
    
    if remaining_vars == 0:
        print(f"✅ Renderização completa! Todas as variáveis substituídas.")
        print(f"   📄 HTML final: {len(rendered)} caracteres")
    else:
        print(f"⚠️ Ainda há {remaining_vars} variáveis não substituídas")
        
        # Mostrar quais faltaram
        import re
        missing = re.findall(r'\{\{([A-Z_]+)\}\}', rendered)
        if missing:
            print(f"   ❌ Variáveis faltando: {', '.join(set(missing))}")
    
    print("\n" + "="*60)
    print("✅ TESTE DE RENDERIZAÇÃO CONCLUÍDO")
    print("="*60 + "\n")
    
    return True


def preview_template(template_name='order_confirmation.html'):
    """
    Gera preview HTML do template para visualização no navegador
    """
    print(f"\n📋 Gerando preview de {template_name}...\n")
    
    from cart.email_service_v2 import EmailService
    service = EmailService()
    
    template = service._load_template(template_name)
    
    # Dados de exemplo
    context = {
        'CUSTOMER_NAME': 'Maria Santos',
        'ORDER_NUMBER': 'CHV-99999',
        'ORDER_DATE': '15/01/2024 às 14:30',
        'ORDER_STATUS': 'Processando',
        'ORDER_ITEMS': '''
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">Notebook Dell Inspiron 15</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">1</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">45,000.00 MZN</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">45,000.00 MZN</td>
            </tr>
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">Mouse Wireless Logitech</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">2</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">850.00 MZN</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">1,700.00 MZN</td>
            </tr>
        ''',
        'SUBTOTAL': '46,700.00',
        'SHIPPING_COST': '300.00',
        'TOTAL_AMOUNT': '47,000.00',
        'SHIPPING_ADDRESS': 'Rua da Resistência, 1234, Maputo',
        'PAYMENT_METHOD': 'M-PESA',
        # Payment status vars
        'STATUS_EMOJI': '✅',
        'STATUS_TITLE': 'Pagamento Aprovado!',
        'STATUS_MESSAGE': 'Seu pagamento foi confirmado!',
        'HEADER_COLOR': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'BG_COLOR': '#d1fae5',
        'PAYMENT_STATUS': 'APROVADO',
        'CTA_TEXT': 'Ver Pedido',
        'CTA_URL': 'https://chivacomputer.co.mz',
        # Cart recovery vars
        'ITEMS_COUNT': '3',
        'ITEMS_TEXT': 'itens',
        'CART_ITEMS': '<p>Item 1, Item 2, Item 3</p>',
        'CART_TOTAL': '15,000.00',
        'RECOVERY_URL': 'https://chivacomputer.co.mz/carrinho',
        # Shipping vars
        'SHIPPING_METHOD': 'Entrega Expressa',
        'TRACKING_SECTION': '<p style="text-align:center; font-weight: bold;">Código: ABC123XYZ</p>',
        # Admin vars
        'CUSTOMER_EMAIL': 'maria@example.com',
        'CUSTOMER_PHONE': '+258 84 123 4567',
        'SHIPPING_CITY': 'Maputo',
        'SHIPPING_PROVINCE': 'Maputo',
        'ACTION_SECTION': ''
    }
    
    rendered = service._render_template(template, context)
    
    # Salvar preview
    preview_path = Path(__file__).parent / f'preview_{template_name}'
    with open(preview_path, 'w', encoding='utf-8') as f:
        f.write(rendered)
    
    print(f"✅ Preview salvo em: {preview_path}")
    print(f"   Abra no navegador para visualizar\n")
    
    return str(preview_path)


if __name__ == '__main__':
    # Testes
    test_templates()
    test_template_rendering()
    
    # Gerar previews
    print("\n" + "="*60)
    print("🎨 GERANDO PREVIEWS")
    print("="*60 + "\n")
    
    templates = [
        'order_confirmation.html',
        'payment_status.html',
        'shipping_update.html',
        'cart_recovery.html',
        'admin_new_order.html'
    ]
    
    for template in templates:
        preview_template(template)
    
    print("="*60)
    print("✅ TODOS OS TESTES CONCLUÍDOS!")
    print("="*60)
    print("\nAbra os arquivos preview_*.html no navegador para visualizar")
