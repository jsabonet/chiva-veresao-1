"""
Script de teste para o sistema de exportação
Testa os 3 endpoints e os 3 formatos
"""
import requests
import os
from datetime import datetime

# Configuração
API_URL = "http://localhost:8000"
# Cole aqui seu token Firebase (obter do browser: localStorage.getItem('firebaseToken'))
TOKEN = "SEU_TOKEN_AQUI"  # Substituir pelo token real

# Criar pasta para downloads
DOWNLOAD_DIR = "test_exports"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def test_export(endpoint, format_type, filename_prefix):
    """Testa um endpoint de exportação"""
    url = f"{API_URL}{endpoint}?format={format_type}"
    headers = {
        "Authorization": f"Bearer {TOKEN}"
    }
    
    print(f"\n{'='*60}")
    print(f"Testando: {endpoint} (formato: {format_type})")
    print(f"{'='*60}")
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            # Determinar extensão
            ext = "xlsx" if format_type == "excel" else format_type
            filename = f"{filename_prefix}_{format_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
            filepath = os.path.join(DOWNLOAD_DIR, filename)
            
            # Salvar arquivo
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            file_size = len(response.content) / 1024  # KB
            print(f"✅ SUCESSO!")
            print(f"   Arquivo: {filename}")
            print(f"   Tamanho: {file_size:.2f} KB")
            print(f"   Salvo em: {filepath}")
            return True
        else:
            print(f"❌ ERRO: Status {response.status_code}")
            print(f"   Resposta: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEÇÃO: {str(e)}")
        return False

def main():
    """Executa todos os testes"""
    print("="*60)
    print("TESTE DO SISTEMA DE EXPORTAÇÃO")
    print("="*60)
    print(f"API URL: {API_URL}")
    print(f"Pasta de downloads: {DOWNLOAD_DIR}")
    
    # Verificar token
    if TOKEN == "SEU_TOKEN_AQUI":
        print("\n⚠️  ATENÇÃO: Configure o TOKEN antes de executar!")
        print("   1. Abra o browser no frontend")
        print("   2. Console (F12) → digite: localStorage.getItem('firebaseIdToken')")
        print("   3. Copie o token e cole na variável TOKEN neste script")
        return
    
    # Testes
    results = []
    
    # 1. Dashboard (Excel e PDF)
    print("\n" + "="*60)
    print("1. DASHBOARD STATS")
    print("="*60)
    results.append(test_export("/api/cart/admin/export/dashboard", "excel", "dashboard"))
    results.append(test_export("/api/cart/admin/export/dashboard", "pdf", "dashboard"))
    
    # 2. Pedidos (Excel, CSV, PDF)
    print("\n" + "="*60)
    print("2. PEDIDOS")
    print("="*60)
    results.append(test_export("/api/cart/admin/export/orders", "excel", "pedidos"))
    results.append(test_export("/api/cart/admin/export/orders", "csv", "pedidos"))
    results.append(test_export("/api/cart/admin/export/orders", "pdf", "pedidos"))
    
    # 3. Clientes (Excel, CSV, PDF)
    print("\n" + "="*60)
    print("3. CLIENTES")
    print("="*60)
    results.append(test_export("/api/cart/admin/export/customers", "excel", "clientes"))
    results.append(test_export("/api/cart/admin/export/customers", "csv", "clientes"))
    results.append(test_export("/api/cart/admin/export/customers", "pdf", "clientes"))
    
    # Resumo
    print("\n" + "="*60)
    print("RESUMO DOS TESTES")
    print("="*60)
    total = len(results)
    sucessos = sum(results)
    falhas = total - sucessos
    
    print(f"Total de testes: {total}")
    print(f"✅ Sucessos: {sucessos}")
    print(f"❌ Falhas: {falhas}")
    print(f"Taxa de sucesso: {(sucessos/total)*100:.1f}%")
    
    if sucessos == total:
        print("\n🎉 TODOS OS TESTES PASSARAM!")
        print(f"Arquivos salvos em: {os.path.abspath(DOWNLOAD_DIR)}")
    else:
        print("\n⚠️  Alguns testes falharam. Verifique os erros acima.")

if __name__ == "__main__":
    main()
