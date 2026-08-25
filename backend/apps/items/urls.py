from django.urls import path

from apps.items.views import (
    CalendarNoteDetailView,
    CalendarNoteListView,
    ExpiryItemCalendarView,
    ExpiryItemDetailView,
    ExpiryItemListCreateView,
    ExpiryItemStatsView,
)

urlpatterns = [
    path("", ExpiryItemListCreateView.as_view(), name="item-list-create"),
    # "<int:pk>/"보다 먼저 와야 pk 라우트에 걸리지 않는다.
    path("stats/", ExpiryItemStatsView.as_view(), name="item-stats"),
    path("calendar/", ExpiryItemCalendarView.as_view(), name="item-calendar"),
    path("calendar/notes/", CalendarNoteListView.as_view(), name="calendar-note-list"),
    path(
        "calendar/notes/<str:note_date>/",
        CalendarNoteDetailView.as_view(),
        name="calendar-note-detail",
    ),
    path("<int:pk>/", ExpiryItemDetailView.as_view(), name="item-detail"),
]
