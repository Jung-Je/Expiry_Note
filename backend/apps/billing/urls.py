from django.urls import path

from apps.billing.views import (
    AdminPaymentListView,
    AdminUserSubscriptionView,
    CancelSubscriptionView,
    ChangePlanView,
    PaymentListView,
    SubscribeView,
    SubscriptionView,
)

urlpatterns = [
    path("subscription/", SubscriptionView.as_view(), name="billing-subscription"),
    path("subscribe/", SubscribeView.as_view(), name="billing-subscribe"),
    path("change-plan/", ChangePlanView.as_view(), name="billing-change-plan"),
    path("cancel/", CancelSubscriptionView.as_view(), name="billing-cancel"),
    path("payments/", PaymentListView.as_view(), name="billing-payments"),
    path("admin/payments/", AdminPaymentListView.as_view(), name="billing-admin-payments"),
    path(
        "admin/users/<int:user_id>/subscription/",
        AdminUserSubscriptionView.as_view(),
        name="billing-admin-user-subscription",
    ),
]
