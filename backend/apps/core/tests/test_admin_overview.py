from datetime import date

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.billing.models import Payment, Subscription
from apps.core.services import get_admin_overview
from apps.items.models import ExpiryItem


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


class TestAdminOverviewAPI:
    @pytest.mark.django_db
    def test_staff_can_view_overview(self, staff_client, staff_user):
        response = staff_client.get("/api/v1/admin/overview/")

        assert response.status_code == 200
        # staff_user 본인 1명은 항상 집계에 잡힌다.
        assert response.data["users"]["total"] == 1

    @pytest.mark.django_db
    def test_non_staff_is_forbidden(self, db):
        user = User.objects.create_user(
            email="normal@example.com", password="a-strong-pass-1", name="일반유저"
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/admin/overview/")

        assert response.status_code == 403


class TestGetAdminOverview:
    @pytest.mark.django_db
    def test_counts_users_without_a_subscription_row_as_free(self, db):
        # Subscription은 유저가 요금제 화면을 처음 열 때 지연 생성되므로,
        # 방금 가입한 유저는 Subscription 행이 아예 없다.
        User.objects.create_user(
            email="fresh@example.com", password="a-strong-pass-1", name="새유저"
        )

        overview = get_admin_overview()

        assert overview["subscriptions"]["by_plan"]["free"] == 1
        assert overview["subscriptions"]["by_plan"]["basic"] == 0

    @pytest.mark.django_db
    def test_sums_only_succeeded_payments_as_revenue(self, db):
        user = User.objects.create_user(
            email="payer@example.com", password="a-strong-pass-1", name="결제자"
        )
        subscription = Subscription.objects.create(user=user, plan=Subscription.Plan.BASIC)
        Payment.objects.create(
            subscription=subscription,
            amount=4900,
            status=Payment.Status.SUCCEEDED,
            order_id="order-ok",
            paid_at=date.today(),
        )
        Payment.objects.create(
            subscription=subscription,
            amount=9900,
            status=Payment.Status.FAILED,
            order_id="order-fail",
        )

        overview = get_admin_overview()

        assert overview["revenue"]["total"] == 4900

    @pytest.mark.django_db
    def test_counts_items_across_all_users(self, db):
        user = User.objects.create_user(
            email="owner@example.com", password="a-strong-pass-1", name="테스트"
        )
        ExpiryItem.objects.create(user=user, title="구독", expiry_date="2026-12-01")

        overview = get_admin_overview()

        assert overview["items"]["total"] == 1
