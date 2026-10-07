import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
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
        assert response.data[0]["id"] == inquiry.id
        assert response.data[0]["user_email"] == inquiry.user.email
        assert response.data[0]["is_answered"] is False

    @pytest.mark.django_db
    def test_non_staff_is_forbidden(self, asker, inquiry):
        client = APIClient()
        client.force_authenticate(user=asker)

        response = client.get("/api/v1/support/admin/inquiries/")

        assert response.status_code == 403


class TestAdminInquiryDetailAPI:
    @pytest.mark.django_db
    def test_staff_can_mark_as_answered(self, staff_client, inquiry):
        response = staff_client.patch(
            f"/api/v1/support/admin/inquiries/{inquiry.id}/", {"is_answered": True}
        )

        assert response.status_code == 200
        inquiry.refresh_from_db()
        assert inquiry.is_answered is True

    @pytest.mark.django_db
    def test_cannot_edit_content_via_admin_endpoint(self, staff_client, inquiry):
        staff_client.patch(
            f"/api/v1/support/admin/inquiries/{inquiry.id}/", {"content": "변경 시도"}
        )

        inquiry.refresh_from_db()
        assert inquiry.content == "이렇게 하면 에러가 납니다."
