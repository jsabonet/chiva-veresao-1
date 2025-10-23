from rest_framework import serializers
from django.contrib.auth.models import User
from decouple import config
from .models import CustomerProfile
from .models import ExternalAuthUser

class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'date_joined', 'last_login', 'is_staff']

class CustomerProfileSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='user.username', read_only=True)
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email')
    registrationDate = serializers.DateTimeField(source='registration_date')
    lastOrderDate = serializers.DateTimeField(source='last_order_date', allow_null=True)
    totalOrders = serializers.IntegerField(source='total_orders')
    totalSpent = serializers.DecimalField(source='total_spent', max_digits=12, decimal_places=2)

    isStaff = serializers.SerializerMethodField()
    isProtectedAdmin = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            'id','name','email','phone','address','city','province','postal_code','registrationDate',
            'lastOrderDate','totalOrders','totalSpent','status','notes','avatar','isStaff', 'isProtectedAdmin'
        ]

    def get_name(self, obj):
        full = obj.user.get_full_name()
        # Prefer full name, then email, then username (to avoid showing raw Firebase UIDs)
        return full or obj.user.email or obj.user.username

    def get_isStaff(self, obj):
        return bool(obj.user and obj.user.is_staff)

    def get_isProtectedAdmin(self, obj):
        """Return True if this customer corresponds to an ExternalAuthUser whose
        email is listed in FIREBASE_ADMIN_EMAILS or whose ExternalAuthUser.is_protected_admin is True.
        """
        try:
            # Try to find an ExternalAuthUser linked to this user
            ext = ExternalAuthUser.objects.filter(user=obj.user).first()
            if not ext:
                # Fallback: try by firebase_uid stored in username
                username = getattr(obj.user, 'username', None)
                if username:
                    ext = ExternalAuthUser.objects.filter(firebase_uid=username).first()

            if ext and getattr(ext, 'is_protected_admin', False):
                return True

            # If no ExternalAuthUser or not flagged, check env list
            try:
                admin_emails = config('FIREBASE_ADMIN_EMAILS', default='').split(',')
                admin_emails = [e.strip().lower() for e in admin_emails if e and e.strip()]
            except Exception:
                admin_emails = []

            email = (getattr(obj.user, 'email', '') or '').lower()
            return email in admin_emails
        except Exception:
            return False

class CustomerAdminListSerializer(CustomerProfileSerializer):
    pass

class AdminCustomerWriteSerializer(serializers.Serializer):
    # Admin-oriented write serializer to create/update User + CustomerProfile
    email = serializers.EmailField(required=True)
    name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    province = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(required=False, choices=[('active','Ativo'),('inactive','Inativo'),('blocked','Bloqueado')])
    notes = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.URLField(required=False, allow_blank=True)

    def _split_name(self, name: str):
        if not name:
            return '', ''
        parts = name.strip().split()
        if len(parts) == 1:
            return parts[0], ''
        return parts[0], ' '.join(parts[1:])

    def _unique_username_from_email(self, email: str):
        base = (email or 'user').split('@')[0][:30]
        from django.contrib.auth.models import User
        candidate = base
        idx = 1
        while User.objects.filter(username=candidate).exists():
            suffix = f"{idx}"
            candidate = (base[: max(1, 30 - len(suffix))] + suffix)
            idx += 1
        return candidate

    def create(self, validated_data):
        from django.contrib.auth.models import User
        email = validated_data.get('email')
        name = validated_data.get('name', '')
        first_name, last_name = self._split_name(name)

        username = self._unique_username_from_email(email)
        user = User.objects.create_user(username=username, email=email, first_name=first_name, last_name=last_name)

        profile = CustomerProfile.objects.create(
            user=user,
            phone=validated_data.get('phone', ''),
            address=validated_data.get('address', ''),
            city=validated_data.get('city', ''),
            province=validated_data.get('province', ''),
            postal_code=validated_data.get('postal_code', ''),
            notes=validated_data.get('notes', ''),
            avatar=validated_data.get('avatar', ''),
            status=validated_data.get('status', 'active'),
        )
        return profile

    def update(self, instance: CustomerProfile, validated_data):
        user = instance.user
        email = validated_data.get('email')
        if email and email != user.email:
            user.email = email
        name = validated_data.get('name', '')
        if name:
            first_name, last_name = self._split_name(name)
            user.first_name = first_name
            user.last_name = last_name
        user.save()

        for field in ['phone','address','city','province','postal_code','status','notes','avatar']:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        return instance

    def to_representation(self, instance):
        # Return read serializer shape for UI
        return CustomerProfileSerializer(instance).data


# ---- Role / ExternalAuthUser serializers ----
from .models import Role, ExternalAuthUser


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description']


class ExternalAuthUserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)

    class Meta:
        model = ExternalAuthUser
        fields = ['firebase_uid', 'email', 'display_name', 'providers', 'roles', 'is_admin', 'last_seen']
