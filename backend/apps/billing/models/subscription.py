import uuid

from django.conf import settings
from django.db import models


def _generate_customer_key() -> str:
    """토스페이먼츠 customerKey. 무작위·예측 불가능해야 한다는 토스 쪽 요구사항이라
    유저 이메일/id를 그대로 쓰지 않고 uuid4를 쓴다."""
    return f"user-{uuid.uuid4()}"


class Subscription(models.Model):
    """유저 1명당 구독 상태 1행. 첫 조회 시점에 없으면 무료 플랜으로 만들어진다
    (services/subscription.py의 get_or_create_subscription)."""

    class Plan(models.TextChoices):
        FREE = "free", "무료"
        BASIC = "basic", "베이직"
        PRO = "pro", "프로"

    class Status(models.TextChoices):
        # ACTIVE: 무료거나, 유료 플랜(베이직/프로)이면 다음 결제 예정일에 자동 갱신됨.
        ACTIVE = "active", "활성"
        # CANCELED: 해지 신청함 — current_period_end까지는 지금 플랜 유지, 그 이후
        # 스케줄러가 무료로 되돌린다(services/subscription.py의 renew_due_subscriptions).
        CANCELED = "canceled", "해지 예정"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.FREE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    # 토스페이먼츠 쪽 식별자. customer_key는 유저마다 고정, billing_key는 카드
    # 등록 전엔 비어있다.
    customer_key = models.CharField(max_length=64, unique=True, default=_generate_customer_key)
    billing_key = models.CharField(max_length=200, blank=True)

    # 유료 플랜이면 다음 결제 예정일, 해지 예정이면 지금 플랜이 끝나는 날짜.
    current_period_end = models.DateField(null=True, blank=True)
    canceled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "billing"
        verbose_name = "subscription"
        verbose_name_plural = "subscriptions"

    def __str__(self) -> str:
        return f"{self.user_id} ({self.plan}/{self.status})"
