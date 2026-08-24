from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.billing.models import Subscription
from apps.billing.services import get_or_create_subscription


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="a-strong-pass-1", name="테스트"
    )


@pytest.fixture
def client(user):
    api_client = APIClient()
    api_client.force_authenticate(user=user)
    return api_client


class TestSubscriptionAPI:
    @pytest.mark.django_db
    def test_get_returns_a_free_subscription_by_default(self, client):
        response = client.get("/api/v1/billing/subscription/")

        assert response.status_code == 200
        assert response.data["plan"] == "free"
        assert response.data["customer_key"]

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().get("/api/v1/billing/subscription/")
        assert response.status_code == 401


class TestSubscribeAPI:
    @pytest.mark.django_db
    def test_activates_premium_on_success(self, client, user):
        with (
            patch("apps.billing.services.subscription.issue_billing_key") as mock_issue,
            patch("apps.billing.services.subscription.charge_billing_key") as mock_charge,
        ):
            mock_issue.return_value = "billing-key-123"
            mock_charge.return_value = {"paymentKey": "payment-key-1"}

            response = client.post("/api/v1/billing/subscribe/", {"auth_key": "auth-key"})

        assert response.status_code == 200
        assert response.data["plan"] == "premium"

    @pytest.mark.django_db
    def test_returns_400_when_toss_rejects_the_auth_key(self, client):
        with patch("apps.billing.services.subscription.issue_billing_key") as mock_issue:
            from apps.billing.services.toss import TossAPIError

            mock_issue.side_effect = TossAPIError("인증 키가 유효하지 않습니다.")

            response = client.post("/api/v1/billing/subscribe/", {"auth_key": "bad-key"})

        assert response.status_code == 400


class TestCancelAPI:
    @pytest.mark.django_db
    def test_cancels_an_active_premium_subscription(self, client, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.PREMIUM
        subscription.status = Subscription.Status.ACTIVE
        subscription.save()

        response = client.post("/api/v1/billing/cancel/")

        assert response.status_code == 200
        assert response.data["status"] == "canceled"

    @pytest.mark.django_db
    def test_rejects_canceling_a_free_plan(self, client):
        response = client.post("/api/v1/billing/cancel/")

        assert response.status_code == 400


class TestPaymentListAPI:
    @pytest.mark.django_db
    def test_lists_only_the_current_users_payments(self, client, user):
        response = client.get("/api/v1/billing/payments/")

        assert response.status_code == 200
        assert response.data == []
