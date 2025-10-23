from django.db import models
from django.contrib.auth.models import User

class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
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


class Role(models.Model):
    """
    Local role model to manage application roles independently of Firebase
    """
    name = models.CharField(max_length=60, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.name


class ExternalAuthUser(models.Model):
    """
    Mirror of external authentication users (Firebase).
    Kept in PostgreSQL to manage roles and local metadata.
    """
    firebase_uid = models.CharField(max_length=255, unique=True, db_index=True)
    user = models.OneToOneField('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='external_auth')
    email = models.EmailField(blank=True)
    display_name = models.CharField(max_length=255, blank=True)
    providers = models.JSONField(default=list, blank=True)  # list of provider ids
    roles = models.ManyToManyField(Role, blank=True, related_name='external_users')
    is_admin = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'External Auth User'
        verbose_name_plural = 'External Auth Users'

    def __str__(self):
        return self.display_name or self.email or self.firebase_uid

    def set_role(self, role_name: str):
        role, _ = Role.objects.get_or_create(name=role_name)
        self.roles.add(role)

    def clear_roles_except(self, keep: list[str] | None = None):
        if keep is None:
            self.roles.clear()
        else:
            keep_set = set(keep)
            for r in self.roles.all():
                if r.name not in keep_set:
                    self.roles.remove(r)

    def promote_to_admin(self, save=True):
        """
        Promove usuário para admin, atualizando is_admin e adicionando role admin
        """
        self.is_admin = True
        if save:
            self.save()
        
        # Garante que a role admin existe e associa ao usuário
        admin_role, _ = Role.objects.get_or_create(name='admin')
        self.roles.add(admin_role)

        # Se tiver User associado, atualiza flags de admin
        if self.user:
            self.user.is_staff = True
            self.user.is_superuser = True
            self.user.save()
        
        return True

    def revoke_admin(self, save=True):
        """
        Remove privilégios de admin do usuário
        """
        self.is_admin = False
        if save:
            self.save()

        # Remove role admin
        try:
            admin_role = Role.objects.get(name='admin')
            self.roles.remove(admin_role)
        except Role.DoesNotExist:
            pass

        # Se tiver User associado, remove flags de admin
        if self.user:
            self.user.is_staff = False
            self.user.is_superuser = False
            self.user.save()
        
        return True
