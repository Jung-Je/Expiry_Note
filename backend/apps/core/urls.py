from django.urls import path

from apps.core.views import (
    AdminActionLogListView,
    AdminOverviewView,
    AdminUserDetailSummaryView,
    health_check,
)

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("admin/overview/", AdminOverviewView.as_view(), name="admin-overview"),
    path("admin/logs/", AdminActionLogListView.as_view(), name="admin-logs"),
    path(
        "admin/users/<int:user_id>/summary/",
        AdminUserDetailSummaryView.as_view(),
        name="admin-user-summary",
    ),
]
