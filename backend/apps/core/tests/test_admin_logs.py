import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.billing.models import Payment, Subscription
from apps.core.models import AdminActionLog
from apps.core.services import record_admin_action
from apps.items.models import ExpiryItem
from apps.support.models import Inquiry


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="staff@example.com", password="a-strong-pass-1", name="관리자", is_staff=True
    )


@pytest.fixture
def member(db):
    return User.objects.create_user(
        email="member@example.com", password="a-strong-pass-1", name="회원"
    )


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def member_client(member):
    client = APIClient()
    client.force_authenticate(user=member)
    return client


class TestAdminActionLogListAPI:
    @pytest.mark.django_db
    def test_lists_newest_first_with_actor_and_target(self, staff_client, staff_user, member):
        record_admin_action(
            actor=staff_user, action=AdminActionLog.Action.USER_DEACTIVATE, target_user=member
        )
        record_admin_action(
            actor=staff_user, action=AdminActionLog.Action.NOTICE_SEND, summary="점검 안내"
        )

        response = staff_client.get("/api/v1/admin/logs/")

        assert response.status_code == 200
        assert response.data["count"] == 2
        newest, oldest = response.data["results"]
        assert newest["action"] == "notice_send"
        assert newest["summary"] == "점검 안내"
        assert newest["target_user_id"] is None
        assert newest["target_user_email"] is None
        assert oldest["actor_email"] == staff_user.email
        assert oldest["target_user_id"] == member.id
        assert oldest["target_user_email"] == member.email

    @pytest.mark.django_db
    def test_filters_by_action(self, staff_client, staff_user, member):
        record_admin_action(
            actor=staff_user, action=AdminActionLog.Action.USER_DEACTIVATE, target_user=member
        )
        record_admin_action(actor=staff_user, action=AdminActionLog.Action.NOTICE_SEND)

        response = staff_client.get("/api/v1/admin/logs/", {"action": "notice_send"})

        assert [row["action"] for row in response.data["results"]] == ["notice_send"]

    @pytest.mark.django_db
    def test_log_survives_deletion_of_the_accounts_involved(self, staff_client, staff_user):
        other_staff = User.objects.create_user(
            email="gone-staff@example.com", name="퇴사자", is_staff=True
        )
        gone_member = User.objects.create_user(email="gone@example.com", name="탈퇴자")
        record_admin_action(
            actor=other_staff, action=AdminActionLog.Action.PLAN_GRANT, target_user=gone_member
        )
        other_staff.delete()
        gone_member.delete()

        response = staff_client.get("/api/v1/admin/logs/")

        row = response.data["results"][0]
        assert row["actor_email"] is None
        assert row["target_user_email"] is None

    @pytest.mark.django_db
    def test_non_staff_is_forbidden(self, member_client):
        assert member_client.get("/api/v1/admin/logs/").status_code == 403

    @pytest.mark.django_db
    def test_cannot_be_written_through_the_api(self, staff_client):
        response = staff_client.post("/api/v1/admin/logs/", {"action": "notice_send"})

        assert response.status_code == 405


class TestAdminUserSummaryAPI:
    @pytest.mark.django_db
    def test_gathers_a_members_data_across_apps(self, staff_client, staff_user, member):
        ExpiryItem.objects.create(user=member, title="구독", expiry_date="2026-12-01")
        subscription = Subscription.objects.create(user=member, plan=Subscription.Plan.BASIC)
        Payment.objects.create(
            subscription=subscription,
            amount=4900,
            status=Payment.Status.SUCCEEDED,
            order_id="order-1",
        )
        Inquiry.objects.create(user=member, category="bug", title="오류 신고", content="내용")
        record_admin_action(
            actor=staff_user,
            action=AdminActionLog.Action.PLAN_GRANT,
            target_user=member,
            summary="베이직 플랜 · 기간 제한 없음",
        )

        response = staff_client.get(f"/api/v1/admin/users/{member.id}/summary/")

        assert response.status_code == 200
        assert response.data["user"]["email"] == member.email
        assert response.data["user"]["plan"] == "basic"
        assert response.data["item_count"] == 1
        assert [p["order_id"] for p in response.data["payments"]] == ["order-1"]
        assert [i["title"] for i in response.data["inquiries"]] == ["오류 신고"]
        assert [log["summary"] for log in response.data["logs"]] == ["베이직 플랜 · 기간 제한 없음"]

    @pytest.mark.django_db
    def test_does_not_include_other_members_data(self, staff_client, staff_user, member):
        other = User.objects.create_user(email="other@example.com", name="다른회원")
        ExpiryItem.objects.create(user=other, title="남의 항목", expiry_date="2026-12-01")
        Inquiry.objects.create(user=other, category="bug", title="남의 문의", content="내용")
        record_admin_action(
            actor=staff_user, action=AdminActionLog.Action.USER_DEACTIVATE, target_user=other
        )

        response = staff_client.get(f"/api/v1/admin/users/{member.id}/summary/")

        assert response.data["item_count"] == 0
        assert response.data["payments"] == []
        assert response.data["inquiries"] == []
        assert response.data["logs"] == []

    @pytest.mark.django_db
    def test_unknown_member_is_404(self, staff_client):
        assert staff_client.get("/api/v1/admin/users/999999/summary/").status_code == 404

    @pytest.mark.django_db
    def test_non_staff_is_forbidden(self, member_client, member):
        response = member_client.get(f"/api/v1/admin/users/{member.id}/summary/")

        assert response.status_code == 403
