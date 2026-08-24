from django.urls import path

from apps.billing.views import (
    CancelSubscriptionView,
    PaymentListView,
    SubscribeView,
    SubscriptionView,
)

urlpatterns = [
    path("subscription/", SubscriptionView.as_view(), name="billing-subscription"),
    path("subscribe/", SubscribeView.as_view(), name="billing-subscribe"),
    path("cancel/", CancelSubscriptionView.as_view(), name="billing-cancel"),
    path("payments/", PaymentListView.as_view(), name="billing-payments"),
]
