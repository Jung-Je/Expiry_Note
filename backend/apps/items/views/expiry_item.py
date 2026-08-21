from rest_framework import generics

from apps.items.models import ExpiryItem
from apps.items.serializers import ExpiryItemSerializer
from apps.items.services import filter_items


class ExpiryItemListCreateView(generics.ListCreateAPIView):
    serializer_class = ExpiryItemSerializer

    def get_queryset(self):
        return filter_items(
            ExpiryItem.objects.filter(user=self.request.user),
            category=self.request.query_params.get("category"),
            status=self.request.query_params.get("status"),
            search=self.request.query_params.get("search"),
            date=self.request.query_params.get("date"),
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ExpiryItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpiryItemSerializer

    def get_queryset(self):
        # 다른 사용자의 항목은 목록에서 배제되므로 그대로 404가 된다.
        return ExpiryItem.objects.filter(user=self.request.user)
