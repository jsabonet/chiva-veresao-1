from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    # This migration was intended as a defensive add-field but the field
    # already exists in some states. Make it a harmless no-op so test DB
    # creation won't fail due to duplicate column.
    dependencies = [
        ("cart", "0005_cart_applied_promotion"),
    ]

    operations = []
