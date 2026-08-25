from django.contrib import admin

from apps.support.models import Inquiry


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "user", "created_at"]
    list_filter = ["category"]
    search_fields = ["title", "content", "user__email"]
