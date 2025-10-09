from rest_framework import generics, permissions
from .models import Promotion
from .serializers import PromotionSerializer
from customers.views import IsAdmin


class PromotionListCreateAdminView(generics.ListCreateAPIView):
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
    permission_classes = [IsAdmin]


class PromotionDetailAdminView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
    permission_classes = [IsAdmin]

class PromotionPublicListView(generics.ListAPIView):
    serializer_class = PromotionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = getattr(self.request, 'user', None)
        # Evaluate promotions and return only those active and applicable to the user
        return [p for p in Promotion.objects.all() if p.applies_to_user(user)]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx
