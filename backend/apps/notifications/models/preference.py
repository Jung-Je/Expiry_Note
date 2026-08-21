from django.conf import settings
from django.db import models


class NotificationPreference(models.Model):
    """사용자 1명당 알림 관련 설정 1행. 첫 조회/수정 시점에 없으면 만들어진다."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preference",
    )
    push_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "notifications"
        verbose_name = "notification preference"
        verbose_name_plural = "notification preferences"

    def __str__(self) -> str:
        return f"{self.user_id} (push={'on' if self.push_enabled else 'off'})"
