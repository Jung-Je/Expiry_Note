from django.urls import path

from apps.core.views import AdminOverviewView, health_check

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("admin/overview/", AdminOverviewView.as_view(), name="admin-overview"),
]
