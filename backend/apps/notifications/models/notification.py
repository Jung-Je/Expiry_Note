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
        INQUIRY_REPLY = "inquiry_reply", "문의 답변"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    # expiry/payment 알림만 item을 갖는다. inquiry_reply처럼 항목과 무관한
    # 알림 유형이 생기면서 null 허용으로 바꿨다 — 유형별로 item 또는 inquiry
    # 둘 중 하나만 채워진다.
    item = models.ForeignKey(
        "items.ExpiryItem",
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    inquiry = models.ForeignKey(
        "support.Inquiry",
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.EXPIRY)
    title = models.CharField(max_length=100)
    message = models.CharField(max_length=255)
    # 알림 생성 시점의 item.expiry_date. item.expiry_date와 별도로 저장해서,
    # 나중에 항목이 수정되더라도 "이 날짜에 대해 이미 알림을 보냈는지"
    # 판단하는 유일성 검사가 깨지지 않도록 한다. item이 없는 알림 유형은
    # 비워둔다.
    for_date = models.DateField(null=True, blank=True)
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
