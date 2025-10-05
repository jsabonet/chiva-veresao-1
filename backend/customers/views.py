from rest_framework import generics, permissions
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import CustomerProfile
from .serializers import CustomerProfileSerializer, CustomerAdminListSerializer, AdminCustomerWriteSerializer

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        # In dev mode, optionally allow any authenticated user (backend .env controls this)
        if getattr(settings, 'DEV_TREAT_ALL_AUTH_AS_ADMIN', False):
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

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
