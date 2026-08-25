from django.conf import settings
from django.db import models


class CalendarNote(models.Model):
    """일정 화면 달력에서 특정 날짜에 남기는 자유 메모.

    만료 항목(ExpiryItem)과 달리 등록된 항목과 무관하게, 그냥 그 날짜에
    대한 개인 메모(예: "병원 예약", "카드 결제일")를 남기고 싶을 때 쓴다.
    날짜 하나당 메모 하나만 남길 수 있다(같은 날짜에 또 저장하면 덮어씀).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="calendar_notes",
    )
    date = models.DateField()
    content = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "items"
        verbose_name = "calendar note"
        verbose_name_plural = "calendar notes"
        ordering = ["date"]
        constraints = [
            models.UniqueConstraint(fields=["user", "date"], name="unique_calendar_note_per_date"),
        ]

    def __str__(self) -> str:
        return f"{self.date} ({self.user_id})"
