from django.urls import path

from apps.items.views import (
    ExpiryItemCalendarView,
    ExpiryItemDetailView,
    ExpiryItemListCreateView,
    ExpiryItemStatsView,
)

urlpatterns = [
    path("", ExpiryItemListCreateView.as_view(), name="item-list-create"),
    # Must come before "<int:pk>/" so these aren't swallowed by the pk route.
    path("stats/", ExpiryItemStatsView.as_view(), name="item-stats"),
    path("calendar/", ExpiryItemCalendarView.as_view(), name="item-calendar"),
    path("<int:pk>/", ExpiryItemDetailView.as_view(), name="item-detail"),
]
