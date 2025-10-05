from rest_framework import serializers
from .models import Promotion
from customers.models import Role


class RoleShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name']

class PromotionSerializer(serializers.ModelSerializer):
    isActiveNow = serializers.BooleanField(source='is_active_now', read_only=True)
    allowed_roles = RoleShortSerializer(many=True, read_only=True)
    appliesToUser = serializers.SerializerMethodField()

    def get_appliesToUser(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        return obj.applies_to_user(user)
    class Meta:
        model = Promotion
        fields = [
            'id', 'name', 'description', 'banner_image', 'start_date', 'end_date',
            'discount_type', 'discount_value', 'status', 'isActiveNow', 'appliesToUser',
            'allowed_roles', 'created_at', 'updated_at'
        ]
