from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.billing.models import Payment, Subscription
from apps.billing.services import (
    PLAN_MONTHLY_AMOUNT,
    SubscriptionError,
    cancel_subscription,
    change_plan,
    describe_item_limit,
    get_or_create_subscription,
    renew_due_subscriptions,
    start_subscription,
)
from apps.billing.services.toss import TossAPIError


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="a-strong-pass-1", name="테스트"
    )


class TestGetOrCreateSubscription:
    @pytest.mark.django_db
    def test_creates_a_free_subscription_with_a_unique_customer_key(self, user):
        subscription = get_or_create_subscription(user)

        assert subscription.plan == Subscription.Plan.FREE
        assert subscription.status == Subscription.Status.ACTIVE
        assert subscription.customer_key

    @pytest.mark.django_db
    def test_returns_the_same_subscription_on_repeat_calls(self, user):
        first = get_or_create_subscription(user)
        second = get_or_create_subscription(user)

        assert first.pk == second.pk
        assert Subscription.objects.count() == 1


class TestStartSubscription:
    @pytest.mark.django_db
    def test_activates_chosen_plan_after_successful_charge(self, user):
        with (
            patch("apps.billing.services.subscription.issue_billing_key") as mock_issue,
            patch("apps.billing.services.subscription.charge_billing_key") as mock_charge,
        ):
            mock_issue.return_value = "billing-key-123"
            mock_charge.return_value = {"paymentKey": "payment-key-1"}

            subscription = start_subscription(user, auth_key="auth-key", plan=Subscription.Plan.PRO)

        assert subscription.plan == Subscription.Plan.PRO
        assert subscription.status == Subscription.Status.ACTIVE
        assert subscription.billing_key == "billing-key-123"
        assert subscription.current_period_end == timezone.localdate() + timedelta(days=30)

        payment = Payment.objects.get(subscription=subscription)
        assert payment.status == Payment.Status.SUCCEEDED
        assert payment.amount == PLAN_MONTHLY_AMOUNT[Subscription.Plan.PRO]

    @pytest.mark.django_db
    def test_rejects_free_as_a_target_plan(self, user):
        with pytest.raises(SubscriptionError):
            start_subscription(user, auth_key="auth-key", plan=Subscription.Plan.FREE)

    @pytest.mark.django_db
    def test_does_not_activate_plan_when_billing_key_issuance_fails(self, user):
        with patch("apps.billing.services.subscription.issue_billing_key") as mock_issue:
            mock_issue.side_effect = TossAPIError("인증 키가 만료되었습니다.")

            with pytest.raises(SubscriptionError):
                start_subscription(user, auth_key="expired-key", plan=Subscription.Plan.BASIC)

        subscription = get_or_create_subscription(user)
        assert subscription.plan == Subscription.Plan.FREE
        assert subscription.billing_key == ""
        assert Payment.objects.count() == 0

    @pytest.mark.django_db
    def test_keeps_billing_key_but_stays_free_when_first_charge_fails(self, user):
        # 카드 등록 자체는 성공했으니(billing_key 발급됨) 재시도할 때 카드를
        # 다시 등록할 필요는 없어야 한다.
        with (
            patch("apps.billing.services.subscription.issue_billing_key") as mock_issue,
            patch("apps.billing.services.subscription.charge_billing_key") as mock_charge,
        ):
            mock_issue.return_value = "billing-key-123"
            mock_charge.side_effect = TossAPIError("카드사에서 결제를 거절했습니다.")

            with pytest.raises(SubscriptionError):
                start_subscription(user, auth_key="auth-key", plan=Subscription.Plan.BASIC)

        subscription = get_or_create_subscription(user)
        assert subscription.plan == Subscription.Plan.FREE
        assert subscription.billing_key == "billing-key-123"

        payment = Payment.objects.get(subscription=subscription)
        assert payment.status == Payment.Status.FAILED


class TestChangePlan:
    @pytest.mark.django_db
    def test_switches_between_paid_plans_without_a_new_charge(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.BASIC
        subscription.status = Subscription.Status.ACTIVE
        subscription.billing_key = "billing-key-123"
        subscription.save()

        with patch("apps.billing.services.subscription.charge_billing_key") as mock_charge:
            result = change_plan(user, plan=Subscription.Plan.PRO)

        mock_charge.assert_not_called()
        assert result.plan == Subscription.Plan.PRO

    @pytest.mark.django_db
    def test_rejects_changing_to_free(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.BASIC
        subscription.status = Subscription.Status.ACTIVE
        subscription.save()

        with pytest.raises(SubscriptionError):
            change_plan(user, plan=Subscription.Plan.FREE)

    @pytest.mark.django_db
    def test_rejects_changing_plan_on_a_free_subscription(self, user):
        get_or_create_subscription(user)

        with pytest.raises(SubscriptionError):
            change_plan(user, plan=Subscription.Plan.PRO)

    @pytest.mark.django_db
    def test_rejects_changing_to_the_same_plan(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.PRO
        subscription.status = Subscription.Status.ACTIVE
        subscription.save()

        with pytest.raises(SubscriptionError):
            change_plan(user, plan=Subscription.Plan.PRO)


class TestCancelSubscription:
    @pytest.mark.django_db
    def test_marks_active_paid_subscription_as_canceled(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.PRO
        subscription.status = Subscription.Status.ACTIVE
        subscription.current_period_end = timezone.localdate() + timedelta(days=10)
        subscription.save()

        result = cancel_subscription(user)

        assert result.status == Subscription.Status.CANCELED
        assert result.canceled_at is not None
        # 해지해도 이번 결제 주기까지는 지금 플랜이 유지된다.
        assert result.plan == Subscription.Plan.PRO

    @pytest.mark.django_db
    def test_rejects_canceling_a_free_subscription(self, user):
        get_or_create_subscription(user)

        with pytest.raises(SubscriptionError):
            cancel_subscription(user)


class TestRenewDueSubscriptions:
    @pytest.mark.django_db
    def test_charges_and_extends_active_subscriptions_due_today(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.PRO
        subscription.status = Subscription.Status.ACTIVE
        subscription.billing_key = "billing-key-123"
        subscription.current_period_end = timezone.localdate()
        subscription.save()

        with patch("apps.billing.services.subscription.charge_billing_key") as mock_charge:
            mock_charge.return_value = {"paymentKey": "payment-key-2"}
            renewed = renew_due_subscriptions()

        assert len(renewed) == 1
        subscription.refresh_from_db()
        assert subscription.plan == Subscription.Plan.PRO
        assert subscription.current_period_end == timezone.localdate() + timedelta(days=30)

        payment = Payment.objects.get(subscription=subscription, toss_payment_key="payment-key-2")
        assert payment.amount == PLAN_MONTHLY_AMOUNT[Subscription.Plan.PRO]

    @pytest.mark.django_db
    def test_renews_basic_plan_at_its_own_price(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.BASIC
        subscription.status = Subscription.Status.ACTIVE
        subscription.billing_key = "billing-key-123"
        subscription.current_period_end = timezone.localdate()
        subscription.save()

        with patch("apps.billing.services.subscription.charge_billing_key") as mock_charge:
            mock_charge.return_value = {"paymentKey": "payment-key-3"}
            renew_due_subscriptions()

        payment = Payment.objects.get(subscription=subscription)
        assert payment.amount == PLAN_MONTHLY_AMOUNT[Subscription.Plan.BASIC]

    @pytest.mark.django_db
    def test_downgrades_to_free_when_renewal_charge_fails(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.PRO
        subscription.status = Subscription.Status.ACTIVE
        subscription.billing_key = "billing-key-123"
        subscription.current_period_end = timezone.localdate()
        subscription.save()

        with patch("apps.billing.services.subscription.charge_billing_key") as mock_charge:
            mock_charge.side_effect = TossAPIError("카드사에서 결제를 거절했습니다.")
            renewed = renew_due_subscriptions()

        assert renewed == []
        subscription.refresh_from_db()
        assert subscription.plan == Subscription.Plan.FREE
        # 카드 정보는 남겨둔다 — 다시 구독할 때 재등록 불필요.
        assert subscription.billing_key == "billing-key-123"

    @pytest.mark.django_db
    def test_ignores_subscriptions_not_yet_due(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.PRO
        subscription.status = Subscription.Status.ACTIVE
        subscription.billing_key = "billing-key-123"
        subscription.current_period_end = timezone.localdate() + timedelta(days=5)
        subscription.save()

        with patch("apps.billing.services.subscription.charge_billing_key") as mock_charge:
            renewed = renew_due_subscriptions()

        mock_charge.assert_not_called()
        assert renewed == []

    @pytest.mark.django_db
    def test_downgrades_canceled_subscriptions_past_their_period_end(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.PRO
        subscription.status = Subscription.Status.CANCELED
        subscription.current_period_end = timezone.localdate() - timedelta(days=1)
        subscription.save()

        renew_due_subscriptions()

        subscription.refresh_from_db()
        assert subscription.plan == Subscription.Plan.FREE
        assert subscription.status == Subscription.Status.ACTIVE


class TestDescribeItemLimit:
    @pytest.mark.django_db
    def test_free_plan_suggests_both_paid_tiers(self, user):
        limit, message = describe_item_limit(user)

        assert limit == 5
        assert "베이직" in message
        assert "프로" in message

    @pytest.mark.django_db
    def test_basic_plan_suggests_pro_only(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.BASIC
        subscription.save()

        limit, message = describe_item_limit(user)

        assert limit == 15
        # 이미 베이직이니 베이직을 업그레이드 대상으로 다시 권하면 안 된다.
        assert "베이직(" not in message
        assert "프로로 업그레이드" in message

    @pytest.mark.django_db
    def test_pro_plan_has_no_limit_or_message(self, user):
        subscription = get_or_create_subscription(user)
        subscription.plan = Subscription.Plan.PRO
        subscription.save()

        limit, message = describe_item_limit(user)

        assert limit is None
        assert message == ""
