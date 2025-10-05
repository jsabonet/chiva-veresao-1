"""
Script para gerenciar permissões admin no Firebase
Uso: python manage.py shell < set_firebase_admin.py
"""

import firebase_admin
from firebase_admin import auth
import sys

def set_admin_claim(email, admin=True):
    try:
        # Obter usuário pelo email
        user = auth.get_user_by_email(email)
        
        # Atualizar custom claims
        claims = user.custom_claims or {}
        claims['admin'] = admin
        
        # Aplicar claims
        auth.set_custom_user_claims(user.uid, claims)
        
        print(f"✅ Admin claim {'added to' if admin else 'removed from'} {email}")
        return True
        
    except auth.UserNotFoundError:
        print(f"❌ User not found: {email}")
        return False
    except Exception as e:
        print(f"❌ Error setting admin claim: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python set_firebase_admin.py <email> [--remove]")
        return
    
    email = sys.argv[1]
    remove = "--remove" in sys.argv
    
    if set_admin_claim(email, not remove):
        print(f"Successfully {'removed' if remove else 'added'} admin privileges for {email}")
    else:
        print(f"Failed to {'remove' if remove else 'add'} admin privileges")

if __name__ == "__main__":
    main()