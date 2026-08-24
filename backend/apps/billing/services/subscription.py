"""구독 상태 관리 — 카드 등록/최초 결제, 해지, 매달 자동 갱신 결제.

토스 API 호출(services/toss.py)은 느린 네트워크 요청이라 DB 트랜잭션으로
감싸지 않는다 — 트랜잭션 안에서 외부 호출을 기다리면 그동안 커넥션/락을
붙잡게 되고, 프로세스가 죽으면 "결제는 됐는데 우리 쪽엔 기록이 없는"
상황이 생길 수 있다. 대신 각 단계(빌링키 저장, 결제 기록)를 작은 단위로
바로바로 커밋한다.
"""

import uuid
from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import User
from apps.billing.models import Payment, Subscription
from apps.billing.services.toss import TossAPIError, charge_billing_key, issue_billing_key

PREMIUM_MONTHLY_AMOUNT = 2900
PREMIUM_ORDER_NAME = "만료노트 프리미엄 월 구독"
BILLING_PERIOD_DAYS = 30


class SubscriptionError(Exception):
    pass


def get_or_create_subscription(user: User) -> Subscription:
    subscription, _ = Subscription.objects.get_or_create(user=user)
    return subscription


def _make_order_id() -> str:
    return f"order-{uuid.uuid4()}"


def _charge_and_record(subscription: Subscription, user: User) -> Payment:
    order_id = _make_order_id()
    try:
        result = charge_billing_key(
            billing_key=subscription.billing_key,
            customer_key=subscription.customer_key,
            amount=PREMIUM_MONTHLY_AMOUNT,
            order_id=order_id,
            order_name=PREMIUM_ORDER_NAME,
            customer_email=user.email,
        )
    except TossAPIError as exc:
        Payment.objects.create(
            subscription=subscription,
            amount=PREMIUM_MONTHLY_AMOUNT,
            status=Payment.Status.FAILED,
            order_id=order_id,
            failure_reason=str(exc),
        )
        raise SubscriptionError(str(exc)) from exc

    return Payment.objects.create(
        subscription=subscription,
        amount=PREMIUM_MONTHLY_AMOUNT,
        status=Payment.Status.SUCCEEDED,
        order_id=order_id,
        toss_payment_key=result.get("paymentKey", ""),
        paid_at=timezone.now(),
    )


def start_subscription(user: User, *, auth_key: str) -> Subscription:
    """카드 등록 인증(authKey)을 빌링키로 교환하고, 첫 결제를 즉시 청구해
    구독을 프리미엄으로 활성화한다."""
    subscription = get_or_create_subscription(user)

    try:
        billing_key = issue_billing_key(auth_key=auth_key, customer_key=subscription.customer_key)
    except TossAPIError as exc:
        raise SubscriptionError(str(exc)) from exc

    # 빌링키는 카드 등록 자체는 성공했다는 뜻이라, 이후 결제가 실패하더라도
    # 남겨둔다 — 재시도할 때 카드를 다시 등록할 필요가 없다.
    subscription.billing_key = billing_key
    subscription.save(update_fields=["billing_key"])

    _charge_and_record(subscription, user)

    subscription.plan = Subscription.Plan.PREMIUM
    subscription.status = Subscription.Status.ACTIVE
    subscription.current_period_end = timezone.localdate() + timedelta(days=BILLING_PERIOD_DAYS)
    subscription.canceled_at = None
    subscription.save(update_fields=["plan", "status", "current_period_end", "canceled_at"])
    return subscription


def cancel_subscription(user: User) -> Subscription:
    """다음 결제부터 청구를 멈춘다. 이미 낸 이번 결제 주기(current_period_end)까지는
    프리미엄이 그대로 유지된다 — README에 명시한 "언제든 해지" 정책."""
    subscription = get_or_create_subscription(user)
    if (
        subscription.plan != Subscription.Plan.PREMIUM
        or subscription.status != Subscription.Status.ACTIVE
    ):
        raise SubscriptionError("구독 중인 상태가 아닙니다.")

    subscription.status = Subscription.Status.CANCELED
    subscription.canceled_at = timezone.now()
    subscription.save(update_fields=["status", "canceled_at"])
    return subscription


def renew_due_subscriptions() -> list[Subscription]:
    """오늘이 결제 예정일인 활성 구독을 갱신 청구한다.

    스케줄러(apps/core/management/commands/runscheduler.py)에서 매일 호출하는
    걸 전제로 만들었다. 결제가 실패하면 카드 정보(billing_key)는 남겨두고
    바로 무료 플랜으로 내린다 — 재시도하려면 카드를 다시 등록해야 한다.
    """
    today = timezone.localdate()

    renewed = []
    due_active = Subscription.objects.filter(
        plan=Subscription.Plan.PREMIUM,
        status=Subscription.Status.ACTIVE,
        current_period_end__lte=today,
    )
    for subscription in due_active:
        try:
            _charge_and_record(subscription, subscription.user)
        except SubscriptionError:
            subscription.plan = Subscription.Plan.FREE
            subscription.save(update_fields=["plan"])
            continue
        subscription.current_period_end = today + timedelta(days=BILLING_PERIOD_DAYS)
        subscription.save(update_fields=["current_period_end"])
        renewed.append(subscription)

    # 해지 예약해뒀던 구독 중 이번 주기가 끝난 것들은 무료로 되돌린다.
    Subscription.objects.filter(
        status=Subscription.Status.CANCELED,
        current_period_end__lte=today,
    ).update(plan=Subscription.Plan.FREE, status=Subscription.Status.ACTIVE)

    return renewed
