from django.contrib import admin

from apps.core.models import AdminActionLog


@admin.register(AdminActionLog)
class AdminActionLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "actor", "action", "target_user", "summary"]
    list_filter = ["action"]
    search_fields = ["actor__email", "target_user__email", "summary"]
    readonly_fields = ["actor", "action", "target_user", "summary", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
