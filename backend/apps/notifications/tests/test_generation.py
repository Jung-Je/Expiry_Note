from datetime import date, timedelta

import pytest

from apps.accounts.models import User
from apps.items.models import ExpiryItem
from apps.notifications.models import Notification
from apps.notifications.services.generation import generate_due_notifications

TODAY = date(2026, 8, 21)


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="a-strong-pass-1", name="테스트"
    )


def _make_item(user, *, title="test", days_from_today, notify_days_before=7, **kwargs):
    return ExpiryItem.objects.create(
        user=user,
        title=title,
        expiry_date=TODAY + timedelta(days=days_from_today),
        notify_days_before=notify_days_before,
        **kwargs,
    )


class TestGenerateDueNotifications:
    @pytest.mark.django_db
    def test_creates_notification_when_days_until_matches_notify_days_before(self, user):
        item = _make_item(user, days_from_today=7, notify_days_before=7)

        created = generate_due_notifications(today=TODAY)

        assert len(created) == 1
        assert created[0].item_id == item.id
        assert created[0].user_id == user.id
        assert created[0].for_date == item.expiry_date

    @pytest.mark.django_db
    def test_does_not_create_when_days_until_does_not_match(self, user):
        _make_item(user, days_from_today=10, notify_days_before=7)

        created = generate_due_notifications(today=TODAY)

        assert created == []
        assert Notification.objects.count() == 0

    @pytest.mark.django_db
    def test_notify_on_expiry_day_itself(self, user):
        item = _make_item(user, days_from_today=0, notify_days_before=0)

        created = generate_due_notifications(today=TODAY)

        assert len(created) == 1
        assert "오늘 만료" in created[0].message
        assert item.id == created[0].item_id

    @pytest.mark.django_db
    def test_ignores_already_expired_items(self, user):
        _make_item(user, days_from_today=-3, notify_days_before=0)

        created = generate_due_notifications(today=TODAY)

        assert created == []

    @pytest.mark.django_db
    def test_is_idempotent(self, user):
        _make_item(user, days_from_today=7, notify_days_before=7)

        first_run = generate_due_notifications(today=TODAY)
        second_run = generate_due_notifications(today=TODAY)

        assert len(first_run) == 1
        assert second_run == []
        assert Notification.objects.count() == 1

    @pytest.mark.django_db
    def test_skips_cancelled_items(self, user):
        _make_item(user, days_from_today=7, notify_days_before=7, is_cancelled=True)

        created = generate_due_notifications(today=TODAY)

        assert created == []
        assert Notification.objects.count() == 0

    @pytest.mark.django_db
    def test_classifies_subscription_as_payment_and_contract_as_expiry(self, user):
        subscription = _make_item(
            user,
            title="sub",
            days_from_today=7,
            notify_days_before=7,
            category=ExpiryItem.Category.SUBSCRIPTION,
        )
        contract = _make_item(
            user,
            title="contract",
            days_from_today=7,
            notify_days_before=7,
            category=ExpiryItem.Category.CONTRACT,
        )

        generate_due_notifications(today=TODAY)

        assert Notification.objects.get(item=subscription).type == Notification.Type.PAYMENT
        assert Notification.objects.get(item=contract).type == Notification.Type.EXPIRY
