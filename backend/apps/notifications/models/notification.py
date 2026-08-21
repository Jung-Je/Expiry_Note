from django.conf import settings
from django.db import models


class Notification(models.Model):
    """만료/결제 예정을 알리는 인앱 알림 한 건.

    `item` + `for_date` 조합으로 유일하다 — 같은 항목의 같은 만료일에 대해
    알림 생성 배치를 여러 번 돌려도 중복 생성되지 않는다.
    """

    class Type(models.TextChoices):
        EXPIRY = "expiry", "만료 예정"
        PAYMENT = "payment", "결제 예정"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    item = models.ForeignKey(
        "items.ExpiryItem",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.EXPIRY)
    title = models.CharField(max_length=100)
    message = models.CharField(max_length=255)
    # item.expiry_date at the time this notification was generated. Kept
    # separate from item.expiry_date so the item can be edited later without
    # breaking the uniqueness check for "already notified about this date".
    for_date = models.DateField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "notifications"
        verbose_name = "notification"
        verbose_name_plural = "notifications"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["item", "for_date"], name="unique_notification_per_item_date"
            )
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.for_date})"
