from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .models import ExternalAuthUser
from decouple import config

@api_view(['GET'])
def check_current_user_admin_status(request):
    """
    Retorna o status de admin do usuário atual, incluindo se é um admin protegido.
    """
    if not request.user.is_authenticated:
        return Response({'detail': 'Não autenticado'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Tenta encontrar o usuário externo
    ext_user = ExternalAuthUser.objects.filter(firebase_uid=request.user.username).first()
    
    # Verificar se o email está na lista de admins protegidos
    try:
        admin_emails = config('FIREBASE_ADMIN_EMAILS', default='').split(',')
        admin_emails = [e.strip().lower() for e in admin_emails if e.strip()]
    except Exception:
        admin_emails = []
    
    user_email = getattr(request.user, 'email', '').lower()
    is_protected_admin = user_email in admin_emails
    
    return Response({
        'isAdmin': bool(ext_user and ext_user.is_admin) if ext_user else False,
        'isProtectedAdmin': is_protected_admin,
        'canManageAdmins': is_protected_admin,  # Apenas admins protegidos podem gerenciar outros admins
    })