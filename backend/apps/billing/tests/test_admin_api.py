from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.billing.models import Payment, Subscription
from apps.billing.services import get_item_limit
from apps.core.models import AdminActionLog


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
        assert response.data["results"][0]["id"] == payment.id
        assert response.data["results"][0]["user_email"] == payment.subscription.user.email
        assert response.data["results"][0]["plan"] == "basic"

    @pytest.mark.django_db
    def test_non_staff_is_forbidden(self, asker, payment):
        client = APIClient()
        client.force_authenticate(user=asker)

        response = client.get("/api/v1/billing/admin/payments/")

        assert response.status_code == 403


class TestAdminGrantPlanAPI:
    def _url(self, user):
        return f"/api/v1/billing/admin/users/{user.id}/subscription/"

    @pytest.mark.django_db
    def test_staff_can_grant_a_paid_plan_without_payment(self, staff_client, asker):
        response = staff_client.patch(self._url(asker), {"plan": "pro"}, format="json")

        assert response.status_code == 200
        assert response.data["plan"] == "pro"
        assert response.data["is_admin_granted"] is True
        assert response.data["current_period_end"] is None
        subscription = Subscription.objects.get(user=asker)
        assert subscription.plan == Subscription.Plan.PRO
        assert not Payment.objects.exists()

    @pytest.mark.django_db
    def test_grant_can_have_an_end_date(self, staff_client, asker):
        period_end = timezone.localdate() + timedelta(days=90)

        response = staff_client.patch(
            self._url(asker), {"plan": "basic", "period_end": str(period_end)}, format="json"
        )

        assert response.status_code == 200
        assert Subscription.objects.get(user=asker).current_period_end == period_end

    @pytest.mark.django_db
    def test_rejects_an_end_date_in_the_past(self, staff_client, asker):
        yesterday = timezone.localdate() - timedelta(days=1)

        response = staff_client.patch(
            self._url(asker), {"plan": "pro", "period_end": str(yesterday)}, format="json"
        )

        assert response.status_code == 400
        assert not Subscription.objects.filter(user=asker, plan="pro").exists()

    @pytest.mark.django_db
    def test_setting_free_clears_the_grant(self, staff_client, asker):
        Subscription.objects.create(
            user=asker,
            plan=Subscription.Plan.PRO,
            is_admin_granted=True,
            current_period_end=timezone.localdate() + timedelta(days=30),
        )

        response = staff_client.patch(self._url(asker), {"plan": "free"}, format="json")

        assert response.status_code == 200
        subscription = Subscription.objects.get(user=asker)
        assert subscription.plan == Subscription.Plan.FREE
        assert subscription.is_admin_granted is False
        assert subscription.current_period_end is None

    @pytest.mark.django_db
    def test_rejects_an_unknown_plan(self, staff_client, asker):
        response = staff_client.patch(self._url(asker), {"plan": "enterprise"}, format="json")

        assert response.status_code == 400

    @pytest.mark.django_db
    def test_non_staff_cannot_grant_a_plan(self, asker):
        client = APIClient()
        client.force_authenticate(user=asker)

        response = client.patch(self._url(asker), {"plan": "pro"}, format="json")

        assert response.status_code == 403
        assert not Subscription.objects.filter(user=asker, plan="pro").exists()

    @pytest.mark.django_db
    def test_returns_404_for_a_missing_user(self, staff_client):
        response = staff_client.patch(
            "/api/v1/billing/admin/users/999999/subscription/", {"plan": "pro"}, format="json"
        )

        assert response.status_code == 404

    @pytest.mark.django_db
    def test_granting_is_logged_with_who_and_what(self, staff_client, staff_user, asker):
        period_end = timezone.localdate() + timedelta(days=30)
        staff_client.patch(
            self._url(asker), {"plan": "pro", "period_end": str(period_end)}, format="json"
        )

        log = AdminActionLog.objects.get()
        assert log.action == AdminActionLog.Action.PLAN_GRANT
        assert log.actor == staff_user
        assert log.target_user == asker
        assert log.summary == f"프로 플랜 · {period_end}까지"

    @pytest.mark.django_db
    def test_saving_the_same_plan_again_is_not_logged_twice(self, staff_client, asker):
        staff_client.patch(self._url(asker), {"plan": "pro"}, format="json")
        staff_client.patch(self._url(asker), {"plan": "pro"}, format="json")

        assert AdminActionLog.objects.count() == 1

    @pytest.mark.django_db
    def test_rejected_grant_is_not_logged(self, staff_client, asker):
        yesterday = timezone.localdate() - timedelta(days=1)
        response = staff_client.patch(
            self._url(asker), {"plan": "pro", "period_end": str(yesterday)}, format="json"
        )

        assert response.status_code == 400
        assert AdminActionLog.objects.count() == 0

    @pytest.mark.django_db
    def test_granted_plan_raises_the_item_limit(self, staff_client, asker):
        staff_client.patch(self._url(asker), {"plan": "pro"}, format="json")

        assert get_item_limit(asker) is None

    @pytest.mark.django_db
    def test_user_list_shows_the_granted_plan(self, staff_client, asker):
        staff_client.patch(self._url(asker), {"plan": "basic"}, format="json")

        response = staff_client.get("/api/v1/auth/admin/users/")

        row = next(row for row in response.data["results"] if row["email"] == asker.email)
        assert row["plan"] == "basic"
        assert row["is_plan_admin_granted"] is True
        # 구독 행이 아직 없는 유저(스태프 본인)는 무료로 보인다.
        staff_row = next(row for row in response.data["results"] if row["email"] != asker.email)
        assert staff_row["plan"] == "free"
        assert staff_row["is_plan_admin_granted"] is False
