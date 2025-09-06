#!/usr/bin/env python3
"""
Script para popular o banco de dados com dados de exemplo
"""

import os
import sys
import django
from django.conf import settings

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from products.models import Category, Product
from decimal import Decimal

def create_sample_data():
    """Cria dados de exemplo para o sistema"""
    
    print("🚀 Criando dados de exemplo...")
    
    # Criar categorias
    categories_data = [
        {
            'name': 'Laptops',
            'description': 'Notebooks e laptops para trabalho e gaming'
        },
        {
            'name': 'Desktops',
            'description': 'Computadores de mesa para todas as necessidades'
        },
        {
            'name': 'Componentes',
            'description': 'Peças e componentes para montagem e upgrade'
        },
        {
            'name': 'Periféricos',
            'description': 'Teclados, mouses, monitores e acessórios'
        },
        {
            'name': 'Gaming',
            'description': 'Equipamentos dedicados para jogos'
        }
    ]
    
    categories = {}
    for cat_data in categories_data:
        category, created = Category.objects.get_or_create(
            name=cat_data['name'],
            defaults={'description': cat_data['description']}
        )
        categories[cat_data['name']] = category
        if created:
            print(f"✅ Categoria criada: {category.name}")
        else:
            print(f"ℹ️  Categoria já existe: {category.name}")
    
    # Criar produtos
    products_data = [
        {
            'name': 'Laptop Dell Inspiron 15',
            'category': 'Laptops',
            'brand': 'Dell',
            'price': Decimal('45000.00'),
            'original_price': Decimal('50000.00'),
            'description': 'Laptop Dell Inspiron 15 com processador Intel Core i5, 8GB RAM, SSD 256GB',
            'short_description': 'Laptop Dell Inspiron 15 - Intel i5, 8GB RAM, SSD 256GB',
            'sku': 'DELL-INS15-001',
            'stock_quantity': 15,
            'min_stock_level': 5,
            'is_featured': True,
            'specifications': {
                'Processador': 'Intel Core i5-1135G7',
                'Memória RAM': '8GB DDR4',
                'Armazenamento': 'SSD 256GB',
                'Tela': '15.6" Full HD',
                'Sistema Operacional': 'Windows 11'
            }
        },
        {
            'name': 'Desktop Gamer RGB',
            'category': 'Desktops',
            'brand': 'Custom Build',
            'price': Decimal('75000.00'),
            'description': 'PC Gamer completo com RGB, processador AMD Ryzen 5, placa de vídeo RTX 3060',
            'short_description': 'PC Gamer RGB - Ryzen 5, RTX 3060, 16GB RAM',
            'sku': 'GAMER-RGB-001',
            'stock_quantity': 8,
            'min_stock_level': 2,
            'is_featured': True,
            'is_bestseller': True,
            'specifications': {
                'Processador': 'AMD Ryzen 5 5600X',
                'Placa de Vídeo': 'NVIDIA RTX 3060',
                'Memória RAM': '16GB DDR4 3200MHz',
                'Armazenamento': 'SSD 500GB + HD 1TB',
                'Placa Mãe': 'B450M Gaming Plus'
            }
        },
        {
            'name': 'Placa de Vídeo RTX 4060',
            'category': 'Componentes',
            'brand': 'NVIDIA',
            'price': Decimal('32000.00'),
            'original_price': Decimal('35000.00'),
            'description': 'Placa de vídeo NVIDIA GeForce RTX 4060 8GB GDDR6',
            'short_description': 'RTX 4060 8GB - Ray Tracing e DLSS 3',
            'sku': 'RTX-4060-8GB',
            'stock_quantity': 12,
            'min_stock_level': 3,
            'is_on_sale': True,
            'specifications': {
                'Memória': '8GB GDDR6',
                'Interface': 'PCI Express 4.0',
                'Ray Tracing': 'Sim',
                'DLSS': 'DLSS 3',
                'Conectores': '3x DisplayPort, 1x HDMI'
            }
        },
        {
            'name': 'Monitor Gamer 24" 144Hz',
            'category': 'Periféricos',
            'brand': 'AOC',
            'price': Decimal('18000.00'),
            'description': 'Monitor gamer AOC 24" Full HD 144Hz, 1ms, FreeSync',
            'short_description': 'Monitor 24" 144Hz - Gaming Full HD',
            'sku': 'AOC-G24-144',
            'stock_quantity': 20,
            'min_stock_level': 5,
            'is_bestseller': True,
            'specifications': {
                'Tamanho': '24 polegadas',
                'Resolução': '1920x1080 (Full HD)',
                'Taxa de Atualização': '144Hz',
                'Tempo de Resposta': '1ms',
                'Tecnologia': 'AMD FreeSync'
            }
        },
        {
            'name': 'Teclado Mecânico RGB',
            'category': 'Gaming',
            'brand': 'Redragon',
            'price': Decimal('4500.00'),
            'description': 'Teclado mecânico Redragon com switches blue, iluminação RGB',
            'short_description': 'Teclado Mecânico RGB - Switches Blue',
            'sku': 'RED-KB-RGB',
            'stock_quantity': 30,
            'min_stock_level': 10,
            'specifications': {
                'Switches': 'Blue Mechanical',
                'Iluminação': 'RGB Backlight',
                'Layout': 'ABNT2',
                'Conectividade': 'USB',
                'Anti-Ghosting': 'Sim'
            }
        },
        {
            'name': 'MacBook Air M2',
            'category': 'Laptops',
            'brand': 'Apple',
            'price': Decimal('95000.00'),
            'description': 'MacBook Air com chip M2, 8GB de memória unificada, SSD de 256GB',
            'short_description': 'MacBook Air M2 - 8GB, SSD 256GB',
            'sku': 'APPLE-MBA-M2',
            'stock_quantity': 5,
            'min_stock_level': 2,
            'is_featured': True,
            'specifications': {
                'Chip': 'Apple M2',
                'Memória': '8GB unificada',
                'Armazenamento': 'SSD 256GB',
                'Tela': '13.6" Liquid Retina',
                'Bateria': 'Até 18 horas'
            }
        }
    ]
    
    for product_data in products_data:
        category = categories[product_data.pop('category')]
        product, created = Product.objects.get_or_create(
            sku=product_data['sku'],
            defaults={**product_data, 'category': category}
        )
        
        if created:
            print(f"✅ Produto criado: {product.name}")
        else:
            print(f"ℹ️  Produto já existe: {product.name}")
    
    print("\n🎉 Dados de exemplo criados com sucesso!")
    print("\n📊 Resumo:")
    print(f"   - Categorias: {Category.objects.count()}")
    print(f"   - Produtos: {Product.objects.count()}")
    print(f"   - Produtos em destaque: {Product.objects.filter(is_featured=True).count()}")
    print(f"   - Produtos em promoção: {Product.objects.filter(is_on_sale=True).count()}")
    print(f"   - Best sellers: {Product.objects.filter(is_bestseller=True).count()}")

if __name__ == "__main__":
    create_sample_data()
