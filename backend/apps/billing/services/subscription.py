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

BILLING_PERIOD_DAYS = 30

# 유료 플랜(요금제 화면 카드와 값을 맞춘다). 무료는 결제가 없어서 여기 없음.
PAID_PLANS = {Subscription.Plan.BASIC, Subscription.Plan.PRO}

PLAN_MONTHLY_AMOUNT: dict[str, int] = {
    Subscription.Plan.BASIC: 4900,
    Subscription.Plan.PRO: 9900,
}
PLAN_ORDER_NAME: dict[str, str] = {
    Subscription.Plan.BASIC: "만료노트 베이직 월 구독",
    Subscription.Plan.PRO: "만료노트 프로 월 구독",
}
# 플랜별 만료 항목 등록 개수 상한. 프로는 무제한(None).
PLAN_ITEM_LIMIT: dict[str, int | None] = {
    Subscription.Plan.FREE: 5,
    Subscription.Plan.BASIC: 15,
    Subscription.Plan.PRO: None,
}
PLAN_LABELS: dict[str, str] = {
    Subscription.Plan.FREE: "무료",
    Subscription.Plan.BASIC: "베이직",
    Subscription.Plan.PRO: "프로",
}


class SubscriptionError(Exception):
    pass


def get_or_create_subscription(user: User) -> Subscription:
    subscription, _ = Subscription.objects.get_or_create(user=user)
    return subscription


def get_item_limit(user: User) -> int | None:
    """이 유저의 만료 항목 등록 개수 상한. 프로면 제한 없음(None).

    항목 개수를 세는 건 apps.items 쪽 책임이라 여기서는 안 한다 —
    apps.items가 이 값만 물어보고 직접 세서 비교한다(순환 임포트 방지).
    """
    subscription = get_or_create_subscription(user)
    return PLAN_ITEM_LIMIT[subscription.plan]


def describe_item_limit(user: User) -> tuple[int | None, str]:
    """(상한, 상한에 도달했을 때 보여줄 안내 문구). 상한이 None(프로)이면
    안내 문구는 안 쓰이므로 빈 문자열로 둔다."""
    subscription = get_or_create_subscription(user)
    limit = PLAN_ITEM_LIMIT[subscription.plan]
    if limit is None:
        return None, ""

    upgrade = (
        "베이직(15개) 또는 프로(무제한)로 업그레이드하면 더 등록할 수 있어요."
        if subscription.plan == Subscription.Plan.FREE
        else "프로로 업그레이드하면 무제한으로 등록할 수 있어요."
    )
    message = f"{PLAN_LABELS[subscription.plan]} 플랜은 최대 {limit}개까지 등록할 수 있습니다. {upgrade}"
    return limit, message


def _make_order_id() -> str:
    return f"order-{uuid.uuid4()}"


def _charge_and_record(subscription: Subscription, user: User, *, plan: str) -> Payment:
    amount = PLAN_MONTHLY_AMOUNT[plan]
    order_id = _make_order_id()
    try:
        result = charge_billing_key(
            billing_key=subscription.billing_key,
            customer_key=subscription.customer_key,
            amount=amount,
            order_id=order_id,
            order_name=PLAN_ORDER_NAME[plan],
            customer_email=user.email,
        )
    except TossAPIError as exc:
        Payment.objects.create(
            subscription=subscription,
            amount=amount,
            status=Payment.Status.FAILED,
            order_id=order_id,
            failure_reason=str(exc),
        )
        raise SubscriptionError(str(exc)) from exc

    return Payment.objects.create(
        subscription=subscription,
        amount=amount,
        status=Payment.Status.SUCCEEDED,
        order_id=order_id,
        toss_payment_key=result.get("paymentKey", ""),
        paid_at=timezone.now(),
    )


def start_subscription(user: User, *, auth_key: str, plan: str) -> Subscription:
    """카드 등록 인증(authKey)을 빌링키로 교환하고, 첫 결제를 즉시 청구해
    구독을 지정한 유료 플랜으로 활성화한다."""
    if plan not in PAID_PLANS:
        raise SubscriptionError("올바르지 않은 요금제입니다.")

    subscription = get_or_create_subscription(user)

    try:
        billing_key = issue_billing_key(auth_key=auth_key, customer_key=subscription.customer_key)
    except TossAPIError as exc:
        raise SubscriptionError(str(exc)) from exc

    # 빌링키는 카드 등록 자체는 성공했다는 뜻이라, 이후 결제가 실패하더라도
    # 남겨둔다 — 재시도할 때 카드를 다시 등록할 필요가 없다.
    subscription.billing_key = billing_key
    subscription.save(update_fields=["billing_key"])

    _charge_and_record(subscription, user, plan=plan)

    subscription.plan = plan
    subscription.status = Subscription.Status.ACTIVE
    subscription.current_period_end = timezone.localdate() + timedelta(days=BILLING_PERIOD_DAYS)
    subscription.canceled_at = None
    subscription.save(update_fields=["plan", "status", "current_period_end", "canceled_at"])
    return subscription


def change_plan(user: User, *, plan: str) -> Subscription:
    """이미 카드가 등록된 유료 구독자가 베이직↔프로 사이에서 플랜을 바꾼다.

    새로 카드를 등록할 필요는 없다(기존 billing_key 그대로 사용). 일할
    정산은 하지 않는 단순한 정책 — 지금 바로 새 플랜으로 바뀌고, 다음
    결제(current_period_end)부터 새 플랜 금액이 청구된다.
    """
    if plan not in PAID_PLANS:
        raise SubscriptionError("올바르지 않은 요금제입니다.")

    subscription = get_or_create_subscription(user)
    if subscription.plan not in PAID_PLANS or subscription.status != Subscription.Status.ACTIVE:
        raise SubscriptionError("구독 중인 상태가 아닙니다.")
    if subscription.plan == plan:
        raise SubscriptionError("이미 이용 중인 요금제입니다.")

    subscription.plan = plan
    subscription.save(update_fields=["plan"])
    return subscription


def cancel_subscription(user: User) -> Subscription:
    """다음 결제부터 청구를 멈춘다. 이미 낸 이번 결제 주기(current_period_end)까지는
    지금 플랜이 그대로 유지된다 — README에 명시한 "언제든 해지" 정책."""
    subscription = get_or_create_subscription(user)
    if subscription.plan not in PAID_PLANS or subscription.status != Subscription.Status.ACTIVE:
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
        plan__in=PAID_PLANS,
        status=Subscription.Status.ACTIVE,
        current_period_end__lte=today,
    )
    for subscription in due_active:
        try:
            _charge_and_record(subscription, subscription.user, plan=subscription.plan)
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
