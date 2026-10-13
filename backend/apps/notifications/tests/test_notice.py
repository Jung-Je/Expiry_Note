import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.billing.models import Subscription
from apps.core.models import AdminActionLog
from apps.notifications.models import Notification

URL = "/api/v1/notifications/admin/notices/"


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


def _member(email: str, *, plan: str | None = None, is_active: bool = True) -> User:
    user = User.objects.create_user(email=email, name="회원", is_active=is_active)
    if plan:
        Subscription.objects.create(user=user, plan=plan)
    return user


class TestAdminNoticeAPI:
    @pytest.mark.django_db
    def test_sends_to_every_active_member(self, staff_client, staff_user):
        member = _member("member@example.com")
        inactive = _member("inactive@example.com", is_active=False)

        response = staff_client.post(
            URL, {"title": "점검 안내", "message": "내일 새벽 2시에 점검합니다."}, format="json"
        )

        assert response.status_code == 201
        # 관리자 본인도 회원이므로 받는다. 비활성 계정은 빠진다.
        assert response.data == {"recipient_count": 2}
        recipients = set(Notification.objects.values_list("user_id", flat=True))
        assert recipients == {staff_user.id, member.id}
        assert inactive.id not in recipients

        notification = Notification.objects.get(user=member)
        assert notification.type == Notification.Type.NOTICE
        assert notification.title == "점검 안내"
        assert notification.message == "내일 새벽 2시에 점검합니다."
        assert notification.is_read is False
        assert notification.item is None

    @pytest.mark.django_db
    def test_can_target_a_single_plan(self, staff_client, staff_user):
        pro = _member("pro@example.com", plan="pro")
        _member("basic@example.com", plan="basic")

        response = staff_client.post(
            URL, {"title": "프로 안내", "message": "내용", "audience": "pro"}, format="json"
        )

        assert response.data == {"recipient_count": 1}
        assert list(Notification.objects.values_list("user_id", flat=True)) == [pro.id]

    @pytest.mark.django_db
    def test_free_audience_includes_members_without_a_subscription_row(
        self, staff_client, staff_user
    ):
        explicit_free = _member("free@example.com", plan="free")
        _member("pro@example.com", plan="pro")

        response = staff_client.post(
            URL, {"title": "무료 안내", "message": "내용", "audience": "free"}, format="json"
        )

        # staff_user는 구독 행이 없다(무료로 친다).
        assert response.data == {"recipient_count": 2}
        recipients = set(Notification.objects.values_list("user_id", flat=True))
        assert recipients == {staff_user.id, explicit_free.id}

    @pytest.mark.django_db
    def test_recipients_see_it_in_their_own_notification_list(self, staff_client):
        member = _member("member@example.com")
        staff_client.post(URL, {"title": "공지", "message": "내용"}, format="json")

        member_client = APIClient()
        member_client.force_authenticate(user=member)
        response = member_client.get("/api/v1/notifications/", {"unread": "1"})

        assert [row["type"] for row in response.data] == ["notice"]

    @pytest.mark.django_db
    def test_sending_is_logged(self, staff_client, staff_user):
        staff_client.post(URL, {"title": "점검 안내", "message": "내용"}, format="json")

        log = AdminActionLog.objects.get()
        assert log.action == AdminActionLog.Action.NOTICE_SEND
        assert log.actor == staff_user
        assert log.target_user is None
        assert log.summary == "점검 안내 · 전체 회원 1명"

    @pytest.mark.django_db
    @pytest.mark.parametrize(
        "payload",
        [
            {"title": "", "message": "내용"},
            {"title": "제목", "message": ""},
            {"title": "제" * 101, "message": "내용"},
            {"title": "제목", "message": "내" * 501},
            {"title": "제목", "message": "내용", "audience": "gold"},
        ],
    )
    def test_invalid_input_sends_nothing(self, staff_client, payload):
        response = staff_client.post(URL, payload, format="json")

        assert response.status_code == 400
        assert Notification.objects.count() == 0
        assert AdminActionLog.objects.count() == 0

    @pytest.mark.django_db
    def test_non_staff_is_forbidden(self, db):
        member = _member("member@example.com")
        client = APIClient()
        client.force_authenticate(user=member)

        response = client.post(URL, {"title": "공지", "message": "내용"}, format="json")

        assert response.status_code == 403
        assert Notification.objects.count() == 0

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().post(URL, {"title": "공지", "message": "내용"}, format="json")

        assert response.status_code == 401
