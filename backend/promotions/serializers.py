from rest_framework import serializers
from .models import Promotion

class PromotionSerializer(serializers.ModelSerializer):
    isActiveNow = serializers.BooleanField(source='is_active_now', read_only=True)

    class Meta:
        model = Promotion
        fields = ['id','name','description','banner_image','start_date','end_date','discount_type','discount_value','status','isActiveNow','created_at','updated_at']
