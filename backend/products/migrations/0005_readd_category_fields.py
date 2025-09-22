from django.db import migrations, models

"""
Migração de reconciliação:
As colunas `is_active` e `order` já existem no banco (erro de DuplicateColumn evidenciou isso).
Objetivo: apenas registrar no histórico de migrações sem tentar recriá-las.

Estratégia:
 - Usar migrations.SeparateDatabaseAndState: no database_operations deixamos vazio
   e no state_operations adicionamos os campos para que o ORM reconheça.
"""

class Migration(migrations.Migration):
    dependencies = [
        ('products', '0004_subcategory_product_subcategory_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='category',
                    name='is_active',
                    field=models.BooleanField(default=True, verbose_name='Ativo'),
                ),
                migrations.AddField(
                    model_name='category',
                    name='order',
                    field=models.PositiveIntegerField(default=0, verbose_name='Ordem'),
                ),
            ]
        )
    ]
