#!/usr/bin/env python
"""
Criar usuário administrador no Django
"""

import os
import sys
import django

# Configurar Django
sys.path.append('/d/Projectos/versao_1_chiva/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.contrib.auth.models import User

def criar_usuario_admin():
    """Criar usuário administrador"""
    
    print("🧪 Criando usuário administrador...")
    
    # Dados do administrador
    firebase_uid = "admin_firebase_uid"
    email = "admin@chiva.com"
    
    # 1. Criar/obter usuário admin
    try:
        user = User.objects.get(username=firebase_uid)
        print(f"✅ Usuário admin já existe: {user.username} ({user.email})")
        
        # Garantir que é staff e superuser
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print(f"✅ Permissões de admin atualizadas")
        
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=firebase_uid,
            email=email,
            first_name="Admin",
            last_name="Chiva",
            is_staff=True,
            is_superuser=True
        )
        print(f"✅ Usuário admin criado: {user.username} ({user.email})")
    
    print(f"👤 Usuário: {user.username}")
    print(f"📧 Email: {user.email}")
    print(f"🛡️ Staff: {user.is_staff}")
    print(f"🔑 Superuser: {user.is_superuser}")
    
    return user

if __name__ == '__main__':
    admin_user = criar_usuario_admin()
    print(f"\n🎉 Usuário administrador configurado!")