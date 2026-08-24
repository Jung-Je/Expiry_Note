from django.contrib import admin

from apps.billing.models import Payment, Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "plan", "status", "current_period_end", "updated_at"]
    list_filter = ["plan", "status"]
    search_fields = ["user__email", "customer_key"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    ordering = ["-created_at"]
    list_display = ["order_id", "subscription", "amount", "status", "paid_at"]
    list_filter = ["status"]
    search_fields = ["order_id", "subscription__user__email"]
