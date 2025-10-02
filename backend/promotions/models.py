from django.db import models

class Promotion(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Rascunho'),
        ('active', 'Ativa'),
        ('expired', 'Expirada'),
    ]

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    banner_image = models.URLField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    discount_type = models.CharField(max_length=20, choices=[('percentage','Percentual'),('fixed','Valor Fixo')], default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Promoção'
        verbose_name_plural = 'Promoções'
        ordering = ['-start_date']

    def __str__(self):
        return self.name

    @property
    def is_active_now(self):
        from django.utils import timezone
        now = timezone.now()
        return self.status == 'active' and self.start_date <= now <= self.end_date
