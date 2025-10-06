from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("cart", "0005_cart_applied_promotion"),
    ]

    operations = [
        # This migration attempts to add the applied_promotion field if it does not exist.
        # It is defensive: if the column already exists the AddField will succeed fast.
        migrations.AddField(
            model_name="cart",
            name="applied_promotion",
            field=models.ForeignKey(
                blank=True,
                help_text="Optional site-wide promotion applied to this cart",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="promotions.promotion",
            ),
        ),
    ]
