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


class TestInquiryListAPI:
    @pytest.mark.django_db
    def test_lists_only_the_current_user_s_inquiries(self, client, user):
        other_user = User.objects.create_user(
            email="other@example.com", password="a-strong-pass-1", name="다른유저"
        )
        mine = Inquiry.objects.create(
            user=user, category=Inquiry.Category.BUG, title="내 문의", content="내용"
        )
        Inquiry.objects.create(
            user=other_user, category=Inquiry.Category.BUG, title="남의 문의", content="내용"
        )

        response = client.get("/api/v1/support/inquiries/")

        assert response.status_code == 200
        assert [i["id"] for i in response.data] == [mine.id]

    @pytest.mark.django_db
    def test_shows_the_admin_s_reply(self, client, user):
        Inquiry.objects.create(
            user=user,
            category=Inquiry.Category.BUG,
            title="내 문의",
            content="내용",
            reply="확인했습니다.",
            is_answered=True,
        )

        response = client.get("/api/v1/support/inquiries/")

        assert response.data[0]["reply"] == "확인했습니다."
        assert response.data[0]["is_answered"] is True
