from django.db import models
from django.utils import timezone

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
    # Optional: restrict promotion to specific local roles (customers.Role)
    allowed_roles = models.ManyToManyField(
        'customers.Role', blank=True, related_name='promotions', help_text='If set, only users with these roles can use the promotion'
    )

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

    def applies_to_user(self, user):
        """
        Check if this promotion applies to the given Django `user`.
        - If `allowed_roles` is empty => applies to everyone when active
        - If user is staff/superuser => allow (convenience)
        - Otherwise, check `ExternalAuthUser` roles linked to the user
        """
        if not self.is_active_now:
            return False

        # No role restriction -> applies to all authenticated/anonymous
        if not self.allowed_roles.exists():
            return True

        # Staff users get access by default
        if user and getattr(user, 'is_staff', False):
            return True

        # Try to check ExternalAuthUser mirror for roles
        try:
            if user and hasattr(user, 'external_auth') and user.external_auth:
                ext = user.external_auth
                user_role_names = set(r.name for r in ext.roles.all())
                allowed_names = set(r.name for r in self.allowed_roles.all())
                return bool(user_role_names & allowed_names)
        except Exception:
            # Silently ignore role-check failures and deny access
            return False

        return False
