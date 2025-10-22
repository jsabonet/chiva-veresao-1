import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
import django
django.setup()

from cart.export_service import ExportService

# Dados de teste com conteúdo longo
test_data = [
    {
        'order_number': 'CHV202510210001',
        'status': 'Confirmado',
        'customer_email': 'cliente.exemplo.muito.longo@dominio-extremamente-grande.com',
        'total': 1250.50,
        'payment_method': 'M-Pesa',
        'created_at': '21/10/2025 14:30',
        'shipping_address': 'Rua Muito Longa Número 1234, Bairro com Nome Extenso, Cidade Grande, Província de Maputo, CEP 12345-678, Próximo ao Mercado Central',
        'tracking_number': 'TRACK123456789012345',
    },
    {
        'order_number': 'CHV202510210002',
        'status': 'Processando',
        'customer_email': 'outro@exemplo.com',
        'total': 500.00,
        'payment_method': 'e-mola',
        'created_at': '21/10/2025 15:45',
        'shipping_address': 'Av. Principal, 100',
        'tracking_number': 'N/A',
    },
]

headers = {
    'order_number': 'Nº Pedido',
    'status': 'Status',
    'customer_email': 'Email Cliente',
    'total': 'Total (MT)',
    'payment_method': 'Pagamento',
    'created_at': 'Data',
    'shipping_address': 'Endereço',
    'tracking_number': 'Rastreamento',
}

print("Gerando PDF de teste...")
response = ExportService.export_to_pdf(
    data=test_data,
    headers=headers,
    filename='test_export',
    title='Teste de Exportação com Conteúdo Longo',
    orientation='landscape'
)

# Salvar arquivo
with open('test_export.pdf', 'wb') as f:
    f.write(response.content)

print("✅ PDF gerado: test_export.pdf")
print(f"Tamanho: {len(response.content)} bytes")
