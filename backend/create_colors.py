#!/usr/bin/env python
import os
import sys
import django

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from products.models import Color

def create_default_colors():
    """Create default colors for the system"""
    
    default_colors = [
        {'name': 'Preto', 'hex_code': '#000000', 'rgb_code': 'rgb(0,0,0)'},
        {'name': 'Branco', 'hex_code': '#FFFFFF', 'rgb_code': 'rgb(255,255,255)'},
        {'name': 'Cinza', 'hex_code': '#808080', 'rgb_code': 'rgb(128,128,128)'},
        {'name': 'Cinza Escuro', 'hex_code': '#404040', 'rgb_code': 'rgb(64,64,64)'},
        {'name': 'Prata', 'hex_code': '#C0C0C0', 'rgb_code': 'rgb(192,192,192)'},
        {'name': 'Azul', 'hex_code': '#0066CC', 'rgb_code': 'rgb(0,102,204)'},
        {'name': 'Azul Escuro', 'hex_code': '#003366', 'rgb_code': 'rgb(0,51,102)'},
        {'name': 'Vermelho', 'hex_code': '#CC0000', 'rgb_code': 'rgb(204,0,0)'},
        {'name': 'Verde', 'hex_code': '#00CC00', 'rgb_code': 'rgb(0,204,0)'},
        {'name': 'Amarelo', 'hex_code': '#FFCC00', 'rgb_code': 'rgb(255,204,0)'},
        {'name': 'Laranja', 'hex_code': '#FF6600', 'rgb_code': 'rgb(255,102,0)'},
        {'name': 'Rosa', 'hex_code': '#FF69B4', 'rgb_code': 'rgb(255,105,180)'},
        {'name': 'Roxo', 'hex_code': '#6600CC', 'rgb_code': 'rgb(102,0,204)'},
        {'name': 'Marrom', 'hex_code': '#8B4513', 'rgb_code': 'rgb(139,69,19)'},
        {'name': 'Dourado', 'hex_code': '#FFD700', 'rgb_code': 'rgb(255,215,0)'},
    ]
    
    created_count = 0
    for color_data in default_colors:
        color, created = Color.objects.get_or_create(
            name=color_data['name'],
            defaults={
                'hex_code': color_data['hex_code'],
                'rgb_code': color_data['rgb_code'],
                'is_active': True
            }
        )
        if created:
            created_count += 1
            print(f"✓ Cor criada: {color.name} ({color.hex_code})")
        else:
            print(f"- Cor já existe: {color.name}")
    
    print(f"\n✅ Processo concluído! {created_count} cores criadas.")
    print(f"📊 Total de cores no sistema: {Color.objects.count()}")

if __name__ == "__main__":
    print("🎨 Criando cores padrão...")
    create_default_colors()
