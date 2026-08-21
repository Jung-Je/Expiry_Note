from django.conf import settings
from django.db import models
from django.utils import timezone

# 만료 임박 상태를 나누는 기준(일). services/expiry_item.py의 필터 로직과
# 반드시 같은 값을 써야 목록 필터와 상세의 상태 표시가 어긋나지 않는다.
URGENT_WITHIN_DAYS = 7
UPCOMING_WITHIN_DAYS = 30


class ExpiryItem(models.Model):
    """계약, 구독, 보증 등 사용자가 등록한 만료 항목 하나."""

    class Category(models.TextChoices):
        SUBSCRIPTION = "subscription", "구독"
        CONTRACT = "contract", "계약"
        WARRANTY = "warranty", "보증"
        MEMBERSHIP = "membership", "멤버십"
        INSURANCE = "insurance", "보험"
        OTHER = "other", "기타"

    class Status(models.TextChoices):
        EXPIRED = "expired", "만료됨"
        URGENT = "urgent", "임박"
        UPCOMING = "upcoming", "예정"
        NORMAL = "normal", "여유"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expiry_items",
    )
    title = models.CharField(max_length=100)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )
    expiry_date = models.DateField()
    # 구독/보험 등 정기 결제 금액(원). 결제가 없는 항목(보증서 등)은 비워둔다.
    amount = models.PositiveIntegerField(null=True, blank=True)
    memo = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "items"
        verbose_name = "expiry item"
        verbose_name_plural = "expiry items"
        ordering = ["expiry_date"]

    def __str__(self) -> str:
        return f"{self.title} ({self.expiry_date})"

    @property
    def days_until_expiry(self) -> int:
        return (self.expiry_date - timezone.localdate()).days

    @property
    def status(self) -> str:
        days = self.days_until_expiry
        if days < 0:
            return self.Status.EXPIRED
        if days <= URGENT_WITHIN_DAYS:
            return self.Status.URGENT
        if days <= UPCOMING_WITHIN_DAYS:
            return self.Status.UPCOMING
        return self.Status.NORMAL
