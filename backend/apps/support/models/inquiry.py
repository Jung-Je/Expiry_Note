from django.conf import settings
from django.db import models


class Inquiry(models.Model):
    """설정 > 도움말 및 문의 화면에서 보낸 1:1 문의."""

    class Category(models.TextChoices):
        GENERAL = "general", "서비스 이용"
        BILLING = "billing", "결제/구독"
        BUG = "bug", "오류 신고"
        FEATURE = "feature", "기능 제안"
        OTHER = "other", "기타"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inquiries",
    )
    category = models.CharField(max_length=20, choices=Category.choices)
    title = models.CharField(max_length=100)
    content = models.TextField()
    # 관리자 화면에서 "답변완료"로 체크했는지 여부. 실제 답변은 이메일로
    # 별도 발송하므로, 여기선 처리 상태만 추적한다.
    is_answered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "support"
        verbose_name = "inquiry"
        verbose_name_plural = "inquiries"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.get_category_display()}] {self.title}"
