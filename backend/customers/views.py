from rest_framework import generics, permissions
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from decouple import config
import os, json
from .models import CustomerProfile
from .models import Role, ExternalAuthUser
from .serializers import RoleSerializer, ExternalAuthUserSerializer
from rest_framework import status
from rest_framework.decorators import api_view

from .serializers import CustomerProfileSerializer, CustomerAdminListSerializer, AdminCustomerWriteSerializer

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def check_current_user_admin_status(request):
    """
    Retorna o status de admin do usuário atual, incluindo se é um admin protegido.
    """
    if not request.user.is_authenticated:
        return Response({'detail': 'Não autenticado'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Tenta encontrar o usuário externo (primeiro por firebase_uid, depois por user relation)
    ext_user = ExternalAuthUser.objects.filter(firebase_uid=request.user.username).first()
    if not ext_user:
        ext_user = ExternalAuthUser.objects.filter(user=request.user).first()

    # Verificar se o email está na lista de admins protegidos
    try:
        admin_emails = config('FIREBASE_ADMIN_EMAILS', default='').split(',')
        admin_emails = [e.strip().lower() for e in admin_emails if e.strip()]
    except Exception:
        admin_emails = []

    user_email = (getattr(request.user, 'email', '') or '').lower()
    is_protected_admin = user_email in admin_emails

    # Determine generic admin status (ExternalAuthUser or Django flags)
    is_admin = False
    try:
        is_admin = bool((ext_user and getattr(ext_user, 'is_admin', False)) or getattr(request.user, 'is_staff', False) or getattr(request.user, 'is_superuser', False))
    except Exception:
        is_admin = getattr(request.user, 'is_staff', False) or getattr(request.user, 'is_superuser', False)

    # Allow managing admins if protected OR any admin (external/Django)
    can_manage_admins = bool(is_protected_admin or is_admin)

    # Enforce that this admin-prefixed endpoint is only callable by admins.
    # We perform a runtime check with the project's IsAdmin permission so that
    # only true admins (ExternalAuthUser/roles/email list/Django flags) can
    # access these admin-prefixed routes.
    try:
        if not IsAdmin().has_permission(request, None):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    except Exception:
        # If permission check fails unexpectedly, deny access.
        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    return Response({
        'isAdmin': is_admin,
        'isProtectedAdmin': is_protected_admin,
        'canManageAdmins': can_manage_admins,
    })
from .serializers import ExternalAuthUserSerializer
from django.shortcuts import get_object_or_404
try:
    import firebase_admin.auth as fb_auth
except Exception:
    fb_auth = None


def _to_frontend_customer(profile: CustomerProfile | None = None, ext: ExternalAuthUser | None = None) -> dict:
    """Return a JSON object shaped like the frontend CustomerProfile interface.
    Prefers values from profile but augments with external auth meta when available.
    Also includes information about protected admin status.
    """
    data = {}
    if profile:
        data.update(CustomerProfileSerializer(profile).data)
        # Ensure id is username string
        try:
            data['id'] = str(profile.user.username)
        except Exception:
            data['id'] = data.get('id')
    # External auth data
    if ext:
        data['firebaseUid'] = getattr(ext, 'firebase_uid', None)
        data['isFirebaseUser'] = True
        data['isAdmin'] = bool(getattr(ext, 'is_admin', False))
        data['isProtectedAdmin'] = bool(ext.is_protected_admin if hasattr(ext, 'is_protected_admin') else False)
        # If profile exists, also reflect Django user flags
        if profile and getattr(profile, 'user', None):
            data['isSuperAdmin'] = bool(getattr(profile.user, 'is_superuser', False))
        else:
            data['isSuperAdmin'] = False
        # Populate basic fields from external auth when profile absent
        if not profile:
            data['id'] = getattr(ext, 'firebase_uid', data.get('id'))
            data['name'] = getattr(ext, 'display_name', data.get('name'))
            data['email'] = getattr(ext, 'email', data.get('email'))
    else:
        # No external auth record
        data['firebaseUid'] = None
        data['isFirebaseUser'] = False
        # derive isAdmin from Django user flags if available
        if profile and getattr(profile, 'user', None):
            data['isAdmin'] = bool(getattr(profile.user, 'is_staff', False))
            data['isSuperAdmin'] = bool(getattr(profile.user, 'is_superuser', False))
        else:
            data['isAdmin'] = False
            data['isSuperAdmin'] = False

    # Ensure camelCase keys exist that frontend accesses
    # Some serializers use different keys (e.g., isStaff) — map if present
    if 'isStaff' in data and 'isAdmin' not in data:
        data['isAdmin'] = bool(data.get('isStaff'))

    return data


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def debug_whoami(request):
    """Debug endpoint: returns info about the authenticated user and auth payload.
    Only available when Django DEBUG is True to avoid exposing sensitive info in production.
    """
    try:
        if not getattr(settings, 'DEBUG', False):
            return Response({'detail': 'Not found'}, status=404)

        # Restrict debug whoami under the admin prefix to admins only.
        try:
            if not IsAdmin().has_permission(request, None):
                return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        user = request.user
        auth_payload = None
        try:
            # DRF authentication classes set request.auth to the second value returned by authenticate()
            auth_payload = request.auth
        except Exception:
            auth_payload = None

        user_info = {
            'is_authenticated': bool(user and user.is_authenticated),
            'username': getattr(user, 'username', None),
            'email': getattr(user, 'email', None),
            'is_staff': bool(getattr(user, 'is_staff', False)),
            'is_superuser': bool(getattr(user, 'is_superuser', False)),
        }

        return Response({
            'user': user_info,
            'auth': auth_payload,
        })
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            print("[IsAdmin] User not authenticated")
            return False
            
        # Log do usuário e token para debug
        try:
            print(f"[IsAdmin] Checking permission for user: {user.username} ({user.email})")
            print(f"[IsAdmin] Django flags: is_staff={user.is_staff}, is_superuser={user.is_superuser}")
            
            auth_payload = getattr(request, 'auth', None)
            if auth_payload and isinstance(auth_payload, dict):
                token_uid = auth_payload.get('uid') or auth_payload.get('user_id')
                print(f"[IsAdmin] Token UID: {token_uid}")

            # Verificar ExternalAuthUser
            from customers.models import ExternalAuthUser, Role
            ext_user = ExternalAuthUser.objects.filter(firebase_uid=user.username).first()
            if ext_user:
                print(f"[IsAdmin] ExternalAuthUser found: is_admin={ext_user.is_admin}")
                print(f"[IsAdmin] Roles: {[r.name for r in ext_user.roles.all()]}")
                
                # Se é admin no ExternalAuthUser OU tem role admin, permite acesso
                admin_role = Role.objects.filter(name='admin').first()
                if ext_user.is_admin or (admin_role and admin_role in ext_user.roles.all()):
                    print("[IsAdmin] Access granted: User has admin status or role")
                    return True
            else:
                print("[IsAdmin] No ExternalAuthUser found")
                
        except Exception as e:
            print(f"[IsAdmin] Error during permission check: {e}")

        # At this point, user is authenticated. We'll consult multiple sources in order:
        # 1) ExternalAuthUser linked to Django user
        # 2) ExternalAuthUser matching the firebase_uid (often stored in user.username)
        # 3) Configured FIREBASE_ADMIN_EMAILS
        # 4) Token claims (request.auth)
        # 5) Django user flags (is_staff / is_superuser)

        # Prepare configured admin emails
        try:
            admin_emails = config('FIREBASE_ADMIN_EMAILS', default='').split(',')
            admin_emails = [e.strip().lower() for e in admin_emails if e and e.strip()]
        except Exception:
            admin_emails = []

        try:
            # 1. Tentar encontrar o ExternalAuthUser pelo token UID primeiro
            auth_payload = getattr(request, 'auth', None)
            if auth_payload and isinstance(auth_payload, dict):
                token_uid = auth_payload.get('uid') or auth_payload.get('user_id')
                if token_uid:
                    ext_user = ExternalAuthUser.objects.filter(firebase_uid=token_uid).first()
                    if ext_user and ext_user.is_admin:
                        print(f"[IsAdmin] Granted access: found admin ExternalAuthUser by token UID {token_uid}")
                        return True
            
            # 2. Se não encontrou, tentar pelo username (que geralmente é o firebase_uid)
            if not ext_user:
                username = getattr(user, 'username', None)
                if username:
                    ext_user = ExternalAuthUser.objects.filter(firebase_uid=username).first()
                    if ext_user and ext_user.is_admin:
                        print(f"[IsAdmin] Granted access: found admin ExternalAuthUser by username {username}")
                        return True
            
            # 3. Se ainda não encontrou, tentar pela relação user direta
            if not ext_user:
                ext_user = ExternalAuthUser.objects.filter(user=user).first()
                if ext_user and ext_user.is_admin:
                    print(f"[IsAdmin] Granted access: found admin ExternalAuthUser by user relation")
                    return True
            
            # Se chegou aqui, não encontrou ou o usuário não é admin
            if ext_user:
                print(f"[IsAdmin] Access denied: found ExternalAuthUser but is_admin=False (uid={ext_user.firebase_uid})")
            else:
                print(f"[IsAdmin] Access denied: no ExternalAuthUser found for user {user.username}")
                
        except Exception as e:
            print(f"[IsAdmin] Error checking permission: {e}")

        # Se chegou aqui, não é admin
        # Detailed debug log to help diagnose permission failures
        try:
            debug_info = {
                'username': getattr(user, 'username', None),
                'user_email': getattr(user, 'email', None),
                'djangostaff': getattr(user, 'is_staff', False),
                'djangosuper': getattr(user, 'is_superuser', False),
                'resolved_ext_user_pk': getattr(ext_user, 'pk', None) if 'ext_user' in locals() and ext_user else None,
                'resolved_ext_user_is_admin': getattr(ext_user, 'is_admin', None) if 'ext_user' in locals() and ext_user else None,
                'token': (auth_payload if 'auth_payload' in locals() else None),
                'admin_emails_configured': admin_emails,
            }
            print(f"[IsAdmin][DENY] {json.dumps(debug_info, default=str)}")
        except Exception as e:
            print(f"[IsAdmin][DENY] could not assemble debug info: {e}")

        return False

class CustomerListAdminView(generics.ListAPIView):
    queryset = CustomerProfile.objects.select_related('user').all()
    serializer_class = CustomerAdminListSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['status', 'province']
    search_fields = ['user__first_name','user__last_name','user__email','phone','city','province']
    ordering_fields = ['registration_date','total_orders','total_spent']
    ordering = ['-registration_date']

class CustomerCreateAdminView(generics.CreateAPIView):
    queryset = CustomerProfile.objects.select_related('user').all()
    serializer_class = AdminCustomerWriteSerializer
    permission_classes = [IsAdmin]

class CustomerDetailAdminView(generics.RetrieveUpdateAPIView):
    queryset = CustomerProfile.objects.select_related('user').all()
    permission_classes = [IsAdmin]
    lookup_field = 'user__username'

    def get_serializer_class(self):
        if self.request.method in ['PUT','PATCH']:
            return AdminCustomerWriteSerializer
        return CustomerProfileSerializer

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_profile(request):
    try:
        # Garantir que o usuário está autenticado
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=403)
            
        # Tentar obter ou criar o perfil com tratamento de erro
        try:
            profile = CustomerProfile.objects.get(user=request.user)
        except CustomerProfile.DoesNotExist:
            # Criar perfil com dados básicos
            profile = CustomerProfile.objects.create(
                user=request.user,
                status='active'
            )
        
        # Serializar e retornar os dados
        serializer = CustomerProfileSerializer(profile)
        return Response(serializer.data)
        
    except Exception as e:
        import traceback
        print(f"Error in me_profile: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {'detail': 'Internal server error', 'message': str(e)},
            status=500
        )


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_check(request):
    """Debug endpoint to check admin status and see why access might be denied"""
    user = request.user
    
    # Informação básica do usuário
    debug_info = {
        'is_authenticated': user.is_authenticated if user else False,
        'username': getattr(user, 'username', None),
        'email': getattr(user, 'email', None),
    }
    
    # Verificar ExternalAuthUser
    ext_user = None
    try:
        # Tentar todos os métodos de encontrar o ExternalAuthUser
        methods_tried = []
        
        # 1. Tentar pelo user
        ext_user = ExternalAuthUser.objects.filter(user=user).first()
        methods_tried.append({
            'method': 'by_user',
            'found': bool(ext_user),
            'user_id': user.id if hasattr(user, 'id') else None
        })
        
        # 2. Tentar pelo firebase_uid no username
        if not ext_user and user.username:
            ext_by_username = ExternalAuthUser.objects.filter(firebase_uid=user.username).first()
            methods_tried.append({
                'method': 'by_username_as_uid',
                'found': bool(ext_by_username),
                'username': user.username
            })
            if ext_by_username:
                ext_user = ext_by_username
        
        # 3. Tentar pelo token
        auth = getattr(request, 'auth', None)
        if auth and isinstance(auth, dict):
            debug_info['token'] = auth
            token_uid = auth.get('uid') or auth.get('user_id')
            if token_uid:
                ext_by_token = ExternalAuthUser.objects.filter(firebase_uid=token_uid).first()
                methods_tried.append({
                    'method': 'by_token_uid',
                    'found': bool(ext_by_token),
                    'token_uid': token_uid
                })
                if not ext_user and ext_by_token:
                    ext_user = ext_by_token
        
        # 4. Tentar por email
        if auth and isinstance(auth, dict):
            token_email = auth.get('email')
            if token_email:
                ext_by_email = ExternalAuthUser.objects.filter(email=token_email).first()
                methods_tried.append({
                    'method': 'by_email',
                    'found': bool(ext_by_email),
                    'email': token_email
                })
                if not ext_user and ext_by_email:
                    ext_user = ext_by_email
        
        debug_info['auth_methods_tried'] = methods_tried
            
        if ext_user:
            debug_info['external_auth'] = {
                'id': ext_user.id,
                'firebase_uid': ext_user.firebase_uid,
                'email': ext_user.email,
                'is_admin': ext_user.is_admin,
                'user_id': ext_user.user.id if ext_user.user else None
            }
    except Exception as e:
        debug_info['external_auth_error'] = str(e)
    
    # Token/Auth info
    auth = getattr(request, 'auth', None)
    if auth and isinstance(auth, dict):
        debug_info['token'] = auth
    
    # Lista todos os ExternalAuthUser com is_admin=True para debug
    try:
        admin_users = ExternalAuthUser.objects.filter(is_admin=True).values('id', 'firebase_uid', 'email', 'is_admin')
        debug_info['all_admin_users'] = list(admin_users)
    except Exception as e:
        debug_info['admin_users_error'] = str(e)
    
    # Testar permissão
    debug_info['has_admin_permission'] = IsAdmin().has_permission(request, None)
    
    return Response(debug_info)
    
    # From user
    if user and user.email:
        emails.append(('django_user', user.email))
    
    # From ExternalAuthUser
    if user and user.is_authenticated:
        try:
            ext = ExternalAuthUser.objects.filter(user=user).first()
            if ext and ext.email:
                emails.append(('external_auth', ext.email))
        except Exception:
            pass
    
    # From token
    auth = getattr(request, 'auth', None)
    if auth and isinstance(auth, dict) and auth.get('email'):
        emails.append(('token', auth['email']))
    
    # Get admin emails list
    try:
        admin_emails = config('FIREBASE_ADMIN_EMAILS', default='').split(',')
        admin_emails = [e.strip() for e in admin_emails if e.strip()]
    except Exception:
        admin_emails = []
    
    return Response({
        'is_admin': is_admin,
        'user_authenticated': bool(user and user.is_authenticated),
        'user_info': {
            'username': getattr(user, 'username', None),
            'is_staff': getattr(user, 'is_staff', False),
            'is_superuser': getattr(user, 'is_superuser', False)
        },
        'emails_found': emails,
        'admin_emails_configured': admin_emails,
        'dev_all_admin': config('DEV_TREAT_ALL_AUTH_AS_ADMIN', default='0', cast=bool)
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_whoami(request):
    """Return the resolved ExternalAuthUser, token payload and whether IsAdmin allows this request.
    This is meant to be called by the frontend when debugging 403s.
    """
    user = request.user
    try:
        ext = ExternalAuthUser.objects.filter(user=user).first()
    except Exception:
        ext = None

    # Also try by username as firebase_uid
    if not ext:
        try:
            candidate_uid = getattr(user, 'username', None)
            if candidate_uid:
                ext = ExternalAuthUser.objects.filter(firebase_uid=candidate_uid).first()
        except Exception:
            ext = None

    auth_payload = getattr(request, 'auth', None)
    is_admin = IsAdmin().has_permission(request, None)

    data = {
        'username': getattr(user, 'username', None),
        'user_email': getattr(user, 'email', None),
        'is_authenticated': bool(user and user.is_authenticated),
        'is_staff': getattr(user, 'is_staff', False),
        'is_superuser': getattr(user, 'is_superuser', False),
        'external_auth_user': ExternalAuthUserSerializer(ext).data if ext else None,
        'token': auth_payload if isinstance(auth_payload, dict) else None,
        'is_admin': is_admin,
    }
    return Response(data)

# Role management
class RoleListCreateAdminView(generics.ListCreateAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdmin]


class RoleListPublicView(generics.ListAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.AllowAny]


@api_view(['GET'])
@permission_classes([IsAdmin])
def external_user_detail(request, firebase_uid):
    try:
        ext = ExternalAuthUser.objects.filter(firebase_uid=firebase_uid).first()
        if not ext:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ExternalAuthUserSerializer(ext).data)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdmin])
def external_user_add_roles(request, firebase_uid):
    # Body: { 'roles': [role_id, ...] }
    try:
        ext = ExternalAuthUser.objects.filter(firebase_uid=firebase_uid).first()
        if not ext:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        role_ids = request.data.get('roles') or []
        added = []
        for rid in role_ids:
            try:
                r = Role.objects.get(id=rid)
                ext.roles.add(r)
                added.append(r.name)
            except Role.DoesNotExist:
                continue
        ext.save()
        return Response({'added': added})
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def external_user_remove_role(request, firebase_uid, role_id):
    try:
        ext = ExternalAuthUser.objects.filter(firebase_uid=firebase_uid).first()
        if not ext:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        try:
            role = Role.objects.get(id=role_id)
            ext.roles.remove(role)
            return Response({'removed': role.name})
        except Role.DoesNotExist:
            return Response({'detail': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Admin permission management endpoints expected by the frontend
@api_view(['POST'])
@permission_classes([IsAdmin])
def customer_grant_admin(request, customer_id):
    """Grant admin access to a customer (sets is_staff/is_superuser and external is_admin).
    Expects JSON body: { 'notes': 'optional notes' }
    Returns serialized CustomerProfile or ExternalAuthUser data.
    """
    try:
        notes = request.data.get('notes', '')
        profile = CustomerProfile.objects.filter(user__username=customer_id).select_related('user').first()
        ext = None
        if not profile:
            # Try external user by firebase_uid or by linked user username
            ext = ExternalAuthUser.objects.filter(firebase_uid=customer_id).first()
            if not ext:
                ext = ExternalAuthUser.objects.filter(user__username=customer_id).first()
        else:
            # Try to find external auth record linked to this user
            ext = ExternalAuthUser.objects.filter(user=profile.user).first()

        # Update Django user flags if available
        if profile and profile.user:
            user = profile.user
            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=['is_staff', 'is_superuser'])


        # Update external auth mirror
        if ext:
            ext.is_admin = True
            ext.save(update_fields=['is_admin'])
            # Try to set Firebase custom claims if available
            try:
                if fb_auth and getattr(ext, 'firebase_uid', None):
                    fb_auth.set_custom_user_claims(ext.firebase_uid, {'admin': True})
            except Exception:
                # Do not fail if Firebase claim update fails
                pass

        if profile or ext:
            return Response(_to_frontend_customer(profile, ext))
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdmin])
def customer_revoke_admin(request, customer_id):
    try:
        notes = request.data.get('notes', '')
        profile = CustomerProfile.objects.filter(user__username=customer_id).select_related('user').first()
        ext = None
        if not profile:
            ext = ExternalAuthUser.objects.filter(firebase_uid=customer_id).first()
            if not ext:
                ext = ExternalAuthUser.objects.filter(user__username=customer_id).first()
        else:
            ext = ExternalAuthUser.objects.filter(user=profile.user).first()

        if profile and profile.user:
            user = profile.user
            user.is_staff = False
            user.is_superuser = False
            user.save(update_fields=['is_staff', 'is_superuser'])

        if ext:
            ext.is_admin = False
            ext.save(update_fields=['is_admin'])
            try:
                if fb_auth and getattr(ext, 'firebase_uid', None):
                    fb_auth.set_custom_user_claims(ext.firebase_uid, {'admin': False})
            except Exception:
                pass

        if profile or ext:
            return Response(_to_frontend_customer(profile, ext))
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdmin])
def customer_permission_history(request, customer_id):
    # Permission change log model may not exist; return empty list as default
    try:
        # If a PermissionChange model exists, try to query it
        from .models import PermissionChange  # type: ignore
        changes = PermissionChange.objects.filter(customer__id=customer_id).order_by('-timestamp')
        data = []
        for c in changes:
            data.append({
                'id': str(c.id),
                'userId': str(getattr(c.customer, 'id', '')),
                'changedBy': getattr(c.changed_by, 'email', '') if getattr(c, 'changed_by', None) else '',
                'changeType': c.change_type,
                'timestamp': c.timestamp.isoformat() if getattr(c, 'timestamp', None) else None,
                'notes': c.notes,
            })
        return Response(data)
    except Exception:
        return Response([], status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdmin])
def customer_sync_firebase(request, customer_id):
    try:
        profile = CustomerProfile.objects.filter(user__username=customer_id).select_related('user').first()
        ext = None
        if profile:
            ext = ExternalAuthUser.objects.filter(user=profile.user).first()
        else:
            ext = ExternalAuthUser.objects.filter(firebase_uid=customer_id).first()

        if not ext:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        # Attempt to fetch Firebase user and sync fields
        if fb_auth and getattr(ext, 'firebase_uid', None):
            try:
                fb_user = fb_auth.get_user(ext.firebase_uid)
                ext.email = getattr(fb_user, 'email', ext.email)
                ext.display_name = getattr(fb_user, 'display_name', ext.display_name)
                claims = getattr(fb_user, 'custom_claims', None) or {}
                ext.is_admin = bool(claims.get('admin'))
                ext.save()
            except Exception as e:
                return Response({'detail': f'Firebase error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # If we have a linked profile, reflect admin flags on user
        if profile and ext:
            if ext.is_admin and profile.user:
                profile.user.is_staff = True
                profile.user.is_superuser = True
                profile.user.save(update_fields=['is_staff', 'is_superuser'])
            elif profile.user:
                profile.user.is_staff = False
                profile.user.is_superuser = False
                profile.user.save(update_fields=['is_staff', 'is_superuser'])

        # Prefer returning CustomerProfile shape if exists
        if profile or ext:
            return Response(_to_frontend_customer(profile, ext))
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
