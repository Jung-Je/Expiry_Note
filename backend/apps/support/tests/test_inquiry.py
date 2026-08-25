from unittest.mock import patch

import pytest

from apps.accounts.models import User
from apps.support.models import Inquiry
from apps.support.services import create_inquiry


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="asker@example.com", password="a-strong-pass-1", name="테스트"
    )


class TestCreateInquiry:
    @pytest.mark.django_db
    def test_saves_the_inquiry(self, user):
        inquiry = create_inquiry(
            user=user,
            category=Inquiry.Category.BUG,
            title="로그인이 안 돼요",
            content="비밀번호를 바꿨는데 로그인이 안 됩니다.",
        )

        assert inquiry.pk is not None
        assert inquiry.user == user
        assert Inquiry.objects.count() == 1

    @pytest.mark.django_db
    def test_sends_a_notification_email(self, user, mailoutbox):
        create_inquiry(
            user=user,
            category=Inquiry.Category.GENERAL,
            title="문의 제목",
            content="문의 내용입니다.",
        )

        assert len(mailoutbox) == 1
        assert "문의 제목" in mailoutbox[0].subject

    @pytest.mark.django_db
    def test_still_saves_the_inquiry_even_if_the_notification_email_fails(self, user):
        with patch("apps.support.services.inquiry.send_inquiry_notification_email") as mock_send:
            mock_send.side_effect = Exception("SMTP down")

            inquiry = create_inquiry(
                user=user,
                category=Inquiry.Category.OTHER,
                title="제목",
                content="내용",
            )

        assert inquiry.pk is not None
        assert Inquiry.objects.count() == 1
