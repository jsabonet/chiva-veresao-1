from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('products', '0010_review_admin_seen_reviewimage'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='review',
            unique_together=set(),
        ),
    ]
