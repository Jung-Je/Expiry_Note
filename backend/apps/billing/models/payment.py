from django.db import models

from apps.billing.models.subscription import Subscription


class Payment(models.Model):
    """구독 결제 시도 1건 — 성공/실패 상관없이 전부 기록한다(결제 내역/영수증용)."""

    class Status(models.TextChoices):
        SUCCEEDED = "succeeded", "성공"
        FAILED = "failed", "실패"

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    amount = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices)

    # 토스페이먼츠 쪽 식별자. 성공한 결제만 payment_key가 채워진다.
    order_id = models.CharField(max_length=64, unique=True)
    toss_payment_key = models.CharField(max_length=200, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)

    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "billing"
        verbose_name = "payment"
        verbose_name_plural = "payments"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.order_id} ({self.status})"
