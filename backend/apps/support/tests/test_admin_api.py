import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.models import AdminActionLog
from apps.notifications.models import Notification
from apps.support.models import Inquiry


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="staff@example.com", password="a-strong-pass-1", name="관리자", is_staff=True
    )


@pytest.fixture
def asker(db):
    return User.objects.create_user(
        email="asker@example.com", password="a-strong-pass-1", name="문의자"
    )


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def inquiry(asker):
    return Inquiry.objects.create(
        user=asker,
        category=Inquiry.Category.BUG,
        title="오류 신고",
        content="이렇게 하면 에러가 납니다.",
    )


class TestAdminInquiryListAPI:
    @pytest.mark.django_db
    def test_staff_can_list_inquiries(self, staff_client, inquiry):
        response = staff_client.get("/api/v1/support/admin/inquiries/")

        assert response.status_code == 200
        assert response.data["results"][0]["id"] == inquiry.id
        assert response.data["results"][0]["user_email"] == inquiry.user.email
        assert response.data["results"][0]["is_answered"] is False

    @pytest.mark.django_db
    def test_filters_by_answered_state(self, staff_client, asker, inquiry):
        answered = Inquiry.objects.create(
            user=asker,
            category=Inquiry.Category.GENERAL,
            title="답변된 문의",
            content="내용",
            reply="답변",
            is_answered=True,
        )

        unanswered_only = staff_client.get(
            "/api/v1/support/admin/inquiries/", {"answered": "false"}
        )
        answered_only = staff_client.get("/api/v1/support/admin/inquiries/", {"answered": "true"})

        assert [row["id"] for row in unanswered_only.data["results"]] == [inquiry.id]
        assert unanswered_only.data["count"] == 1
        assert [row["id"] for row in answered_only.data["results"]] == [answered.id]

    @pytest.mark.django_db
    def test_filters_by_category(self, staff_client, asker, inquiry):
        Inquiry.objects.create(
            user=asker, category=Inquiry.Category.BILLING, title="결제 문의", content="내용"
        )

        response = staff_client.get("/api/v1/support/admin/inquiries/", {"category": "bug"})

        assert [row["id"] for row in response.data["results"]] == [inquiry.id]

    @pytest.mark.django_db
    def test_non_staff_is_forbidden(self, asker, inquiry):
        client = APIClient()
        client.force_authenticate(user=asker)

        response = client.get("/api/v1/support/admin/inquiries/")

        assert response.status_code == 403


class TestAdminInquiryDetailAPI:
    @pytest.mark.django_db
    def test_replying_marks_it_as_answered(self, staff_client, inquiry):
        response = staff_client.patch(
            f"/api/v1/support/admin/inquiries/{inquiry.id}/",
            {"reply": "확인했습니다. 곧 수정하겠습니다."},
        )

        assert response.status_code == 200
        inquiry.refresh_from_db()
        assert inquiry.reply == "확인했습니다. 곧 수정하겠습니다."
        assert inquiry.is_answered is True

    @pytest.mark.django_db
    def test_replying_creates_a_notification_for_the_asker(self, staff_client, inquiry, asker):
        staff_client.patch(
            f"/api/v1/support/admin/inquiries/{inquiry.id}/", {"reply": "답변입니다."}
        )

        notification = Notification.objects.get()
        assert notification.user == asker
        assert notification.inquiry == inquiry
        assert notification.type == Notification.Type.INQUIRY_REPLY

    @pytest.mark.django_db
    def test_editing_an_already_answered_reply_does_not_duplicate_notification(
        self, staff_client, inquiry
    ):
        staff_client.patch(f"/api/v1/support/admin/inquiries/{inquiry.id}/", {"reply": "1차 답변"})
        staff_client.patch(
            f"/api/v1/support/admin/inquiries/{inquiry.id}/", {"reply": "수정된 답변"}
        )

        assert Notification.objects.count() == 1

    @pytest.mark.django_db
    def test_replying_is_logged(self, staff_client, staff_user, inquiry, asker):
        url = f"/api/v1/support/admin/inquiries/{inquiry.id}/"
        staff_client.patch(url, {"reply": "답변입니다."})
        # 같은 내용으로 다시 저장한 건 남지 않는다.
        staff_client.patch(url, {"reply": "답변입니다."})

        log = AdminActionLog.objects.get()
        assert log.action == AdminActionLog.Action.INQUIRY_REPLY
        assert log.actor == staff_user
        assert log.target_user == asker
        assert log.summary == inquiry.title

    @pytest.mark.django_db
    def test_clearing_reply_marks_it_as_unanswered(self, staff_client, inquiry):
        inquiry.reply = "기존 답변"
        inquiry.is_answered = True
        inquiry.save()

        response = staff_client.patch(
            f"/api/v1/support/admin/inquiries/{inquiry.id}/", {"reply": ""}
        )

        assert response.status_code == 200
        inquiry.refresh_from_db()
        assert inquiry.is_answered is False

    @pytest.mark.django_db
    def test_cannot_edit_content_via_admin_endpoint(self, staff_client, inquiry):
        staff_client.patch(
            f"/api/v1/support/admin/inquiries/{inquiry.id}/", {"content": "변경 시도"}
        )

        inquiry.refresh_from_db()
        assert inquiry.content == "이렇게 하면 에러가 납니다."
