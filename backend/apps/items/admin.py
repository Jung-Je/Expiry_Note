from django.contrib import admin

from apps.items.models import CalendarNote, ExpiryItem


@admin.register(ExpiryItem)
class ExpiryItemAdmin(admin.ModelAdmin):
    ordering = ["expiry_date"]
    list_display = ["title", "user", "category", "expiry_date", "amount"]
    list_filter = ["category"]
    search_fields = ["title", "user__email"]


@admin.register(CalendarNote)
class CalendarNoteAdmin(admin.ModelAdmin):
    ordering = ["-date"]
    list_display = ["date", "user", "content"]
    search_fields = ["content", "user__email"]
