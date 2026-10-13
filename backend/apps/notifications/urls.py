from django.urls import path

from apps.notifications.views import (
    AdminNoticeView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationPreferenceView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    # "<int:pk>/read/"보다 먼저 와야 "settings"/"read-all"이 알림 id로
    # 잘못 해석되지 않는다.
    path("settings/", NotificationPreferenceView.as_view(), name="notification-settings"),
    path("admin/notices/", AdminNoticeView.as_view(), name="notification-admin-notices"),
    path("read-all/", NotificationMarkAllReadView.as_view(), name="notification-read-all"),
    path("<int:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
]
