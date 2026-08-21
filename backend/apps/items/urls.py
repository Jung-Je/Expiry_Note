from django.urls import path

from apps.items.views import ExpiryItemDetailView, ExpiryItemListCreateView, ExpiryItemStatsView

urlpatterns = [
    path("", ExpiryItemListCreateView.as_view(), name="item-list-create"),
    # Must come before "<int:pk>/" so "stats" isn't swallowed by the pk route.
    path("stats/", ExpiryItemStatsView.as_view(), name="item-stats"),
    path("<int:pk>/", ExpiryItemDetailView.as_view(), name="item-detail"),
]
