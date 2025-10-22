"""
Teste rápido das rotas de exportação
"""
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.urls import resolve, reverse
from cart import urls as cart_urls

print("="*60)
print("VERIFICAÇÃO DAS ROTAS DE EXPORTAÇÃO")
print("="*60)

# Verificar se as views estão definidas
try:
    from cart import order_views
    print("\n✅ order_views importado com sucesso")
    
    # Verificar se as funções existem
    functions = ['export_orders', 'export_customers', 'export_dashboard_stats']
    for func_name in functions:
        if hasattr(order_views, func_name):
            print(f"   ✅ {func_name} encontrada")
        else:
            print(f"   ❌ {func_name} NÃO encontrada")
except Exception as e:
    print(f"\n❌ Erro ao importar order_views: {e}")

# Verificar URLs registradas
print("\n" + "="*60)
print("URLs REGISTRADAS EM cart.urls:")
print("="*60)

for pattern in cart_urls.urlpatterns:
    if 'export' in str(pattern.pattern):
        print(f"✅ {pattern.pattern} → {pattern.callback.__name__ if hasattr(pattern, 'callback') else 'N/A'}")

# Tentar resolver as URLs
print("\n" + "="*60)
print("TESTE DE RESOLUÇÃO DE URLs:")
print("="*60)

test_urls = [
    '/api/cart/admin/export/orders/',
    '/api/cart/admin/export/customers/',
    '/api/cart/admin/export/dashboard/',
]

for url in test_urls:
    try:
        match = resolve(url)
        print(f"✅ {url}")
        print(f"   View: {match.func.__name__}")
        print(f"   Name: {match.url_name}")
    except Exception as e:
        print(f"❌ {url}")
        print(f"   Erro: {e}")

print("\n" + "="*60)
print("TESTE CONCLUÍDO")
print("="*60)
