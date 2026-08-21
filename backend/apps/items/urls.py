from django.urls import path

from apps.items.views import ExpiryItemDetailView, ExpiryItemListCreateView

urlpatterns = [
    path("", ExpiryItemListCreateView.as_view(), name="item-list-create"),
    path("<int:pk>/", ExpiryItemDetailView.as_view(), name="item-detail"),
]
