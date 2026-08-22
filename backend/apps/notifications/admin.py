from django.contrib import admin

from apps.notifications.models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    ordering = ["-created_at"]
    list_display = ["title", "user", "type", "for_date", "is_read", "created_at"]
    list_filter = ["type", "is_read"]
    search_fields = ["title", "user__email"]


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ["user", "push_enabled", "updated_at"]
