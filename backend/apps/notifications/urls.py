from django.urls import path

from apps.notifications.views import (
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationPreferenceView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    # Must come before "<int:pk>/read/" so "settings"/"read-all" aren't
    # mistaken for a notification id.
    path("settings/", NotificationPreferenceView.as_view(), name="notification-settings"),
    path("read-all/", NotificationMarkAllReadView.as_view(), name="notification-read-all"),
    path("<int:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
]
