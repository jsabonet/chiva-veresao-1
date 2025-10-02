from django.db import models
from django.contrib.auth.models import User

class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    province = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    avatar = models.URLField(blank=True)
    registration_date = models.DateTimeField(auto_now_add=True)
    last_order_date = models.DateTimeField(null=True, blank=True)
    total_orders = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='active', choices=[('active','Ativo'),('inactive','Inativo'),('blocked','Bloqueado')])

    class Meta:
        verbose_name = 'Perfil do Cliente'
        verbose_name_plural = 'Perfis de Clientes'
        ordering = ['user__date_joined']

    def __str__(self):
        return self.user.get_full_name() or self.user.email or self.user.username
