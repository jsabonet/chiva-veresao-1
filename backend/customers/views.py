from rest_framework import generics, permissions
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import CustomerProfile
from .models import Role, ExternalAuthUser
from .serializers import RoleSerializer, ExternalAuthUserSerializer
from rest_framework import status
from rest_framework.decorators import api_view

from .serializers import CustomerProfileSerializer, CustomerAdminListSerializer, AdminCustomerWriteSerializer


@api_view(['GET'])
def debug_whoami(request):
    """Debug endpoint: returns info about the authenticated user and auth payload.
    Only available when Django DEBUG is True to avoid exposing sensitive info in production.
    """
    try:
        if not getattr(settings, 'DEBUG', False):
            return Response({'detail': 'Not found'}, status=404)

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
        # In dev mode, optionally allow any authenticated user (backend .env controls this)
        dev_flag = getattr(settings, 'DEV_TREAT_ALL_AUTH_AS_ADMIN', False)
        user = request.user
        try:
            print(f"[IsAdmin][DEBUG] DEV_TREAT_ALL_AUTH_AS_ADMIN={dev_flag}, user_authenticated={bool(user and user.is_authenticated)}, user_is_staff={bool(getattr(user, 'is_staff', False))}")
        except Exception:
            pass
        if dev_flag:
            return bool(user and user.is_authenticated)
        return bool(user and user.is_authenticated and user.is_staff)

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
