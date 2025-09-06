from products.models import Color

colors = [
    {'name': 'Preto', 'hex_code': '#000000'},
    {'name': 'Branco', 'hex_code': '#FFFFFF'},
    {'name': 'Cinza', 'hex_code': '#808080'},
    {'name': 'Azul', 'hex_code': '#0066CC'},
    {'name': 'Vermelho', 'hex_code': '#CC0000'},
    {'name': 'Verde', 'hex_code': '#00CC00'},
    {'name': 'Amarelo', 'hex_code': '#FFCC00'},
    {'name': 'Prata', 'hex_code': '#C0C0C0'},
]

for color_data in colors:
    color, created = Color.objects.get_or_create(
        name=color_data['name'], 
        defaults={'hex_code': color_data['hex_code'], 'is_active': True}
    )
    print(f'Cor {color.name}: {"criada" if created else "ja existe"}')

print(f'Total de cores: {Color.objects.count()}')
