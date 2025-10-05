from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.conf import settings
from .models import CustomerProfile

@receiver(post_save, sender=User)
def ensure_user_profile(sender, instance, created, **kwargs):
    """Garante que todo usuário tenha um perfil"""
    if created:
        # Criar perfil para novo usuário
        CustomerProfile.objects.get_or_create(user=instance)
        
        # Em desenvolvimento, configurar permissões admin se necessário
        if getattr(settings, 'DEV_TREAT_ALL_AUTH_AS_ADMIN', False):
            instance.is_staff = True
            instance.is_superuser = True
            instance.save(update_fields=['is_staff', 'is_superuser'])