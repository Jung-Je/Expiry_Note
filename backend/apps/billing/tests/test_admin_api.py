import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.billing.models import Payment, Subscription


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="staff@example.com", password="a-strong-pass-1", name="관리자", is_staff=True
    )


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def asker(db):
    return User.objects.create_user(
        email="payer@example.com", password="a-strong-pass-1", name="결제자"
    )


@pytest.fixture
def payment(asker):
    subscription = Subscription.objects.create(user=asker, plan=Subscription.Plan.BASIC)
    return Payment.objects.create(
        subscription=subscription,
        amount=4900,
        status=Payment.Status.SUCCEEDED,
        order_id="order-1",
    )


class TestAdminPaymentListAPI:
    @pytest.mark.django_db
    def test_staff_can_list_all_payments(self, staff_client, payment):
        response = staff_client.get("/api/v1/billing/admin/payments/")

        assert response.status_code == 200
        assert response.data[0]["id"] == payment.id
        assert response.data[0]["user_email"] == payment.subscription.user.email
        assert response.data[0]["plan"] == "basic"

    @pytest.mark.django_db
    def test_non_staff_is_forbidden(self, asker, payment):
        client = APIClient()
        client.force_authenticate(user=asker)

        response = client.get("/api/v1/billing/admin/payments/")

        assert response.status_code == 403
