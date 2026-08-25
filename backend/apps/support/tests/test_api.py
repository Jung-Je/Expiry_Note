import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.support.models import Inquiry


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="asker@example.com", password="a-strong-pass-1", name="테스트"
    )


@pytest.fixture
def client(user):
    api_client = APIClient()
    api_client.force_authenticate(user=user)
    return api_client


class TestInquiryCreateAPI:
    @pytest.mark.django_db
    def test_creates_an_inquiry_for_the_current_user(self, client, user):
        response = client.post(
            "/api/v1/support/inquiries/",
            {"category": "bug", "title": "오류 신고", "content": "이렇게 하면 에러가 납니다."},
        )

        assert response.status_code == 201
        assert response.data["category"] == "bug"
        inquiry = Inquiry.objects.get()
        assert inquiry.user == user

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().post(
            "/api/v1/support/inquiries/",
            {"category": "bug", "title": "제목", "content": "내용"},
        )
        assert response.status_code == 401

    @pytest.mark.django_db
    def test_rejects_a_blank_title(self, client):
        response = client.post(
            "/api/v1/support/inquiries/",
            {"category": "bug", "title": "", "content": "내용"},
        )
        assert response.status_code == 400

    @pytest.mark.django_db
    def test_rejects_an_unknown_category(self, client):
        response = client.post(
            "/api/v1/support/inquiries/",
            {"category": "not-a-real-category", "title": "제목", "content": "내용"},
        )
        assert response.status_code == 400
