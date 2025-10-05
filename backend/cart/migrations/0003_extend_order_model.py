# Expansão do Order Model - Modern E-commerce
# Adicionar novos campos para gestão completa de pedidos

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cart', '0002_order_payment'),
    ]

    operations = [
        # Adicionar novos campos para Order
        migrations.AddField(
            model_name='order',
            name='order_number',
            field=models.CharField(max_length=50, unique=True, null=True, blank=True, verbose_name="Número do Pedido"),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_address',
            field=models.JSONField(default=dict, blank=True, verbose_name="Endereço de Entrega"),
        ),
        migrations.AddField(
            model_name='order',
            name='billing_address',
            field=models.JSONField(default=dict, blank=True, verbose_name="Endereço de Cobrança"),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_method',
            field=models.CharField(max_length=50, default='standard', verbose_name="Método de Entrega"),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_cost',
            field=models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Custo de Entrega"),
        ),
        migrations.AddField(
            model_name='order',
            name='tracking_number',
            field=models.CharField(max_length=100, null=True, blank=True, verbose_name="Número de Rastreamento"),
        ),
        migrations.AddField(
            model_name='order',
            name='estimated_delivery',
            field=models.DateField(null=True, blank=True, verbose_name="Previsão de Entrega"),
        ),
        migrations.AddField(
            model_name='order',
            name='delivered_at',
            field=models.DateTimeField(null=True, blank=True, verbose_name="Entregue em"),
        ),
        migrations.AddField(
            model_name='order',
            name='notes',
            field=models.TextField(blank=True, verbose_name="Observações"),
        ),
        migrations.AddField(
            model_name='order',
            name='customer_notes',
            field=models.TextField(blank=True, verbose_name="Observações do Cliente"),
        ),
        
        # Expandir status choices
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('pending', 'Pendente'),
                    ('confirmed', 'Confirmado'),
                    ('processing', 'Processando'),
                    ('shipped', 'Enviado'),
                    ('delivered', 'Entregue'),
                    ('cancelled', 'Cancelado'),
                    ('refunded', 'Reembolsado'),
                ],
                default='pending'
            ),
        ),
    ]