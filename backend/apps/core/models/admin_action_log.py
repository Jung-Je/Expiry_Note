from django.conf import settings
from django.db import models


class AdminActionLog(models.Model):
    """관리자 화면에서 한 작업 1건의 기록 — 누가, 언제, 누구에게, 무엇을 했는지.

    관리자 계정이 여럿이라 "이 플랜 누가 줬지?" 같은 걸 나중에 확인할 수
    있게 남긴다. 기록은 추가만 하고 고치거나 지우지 않는다.
    """

    class Action(models.TextChoices):
        USER_DEACTIVATE = "user_deactivate", "계정 비활성화"
        USER_REACTIVATE = "user_reactivate", "계정 재활성화"
        PLAN_GRANT = "plan_grant", "요금제 변경"
        INQUIRY_REPLY = "inquiry_reply", "문의 답변"
        NOTICE_SEND = "notice_send", "공지 발송"

    # 관리자나 대상 회원 계정이 지워져도 기록 자체는 남아야 한다.
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="admin_actions",
        null=True,
    )
    action = models.CharField(max_length=30, choices=Action.choices)
    # 공지 발송처럼 특정 회원이 대상이 아닌 작업은 비워둔다.
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="admin_actions_received",
        null=True,
        blank=True,
    )
    # 사람이 읽는 한 줄 설명. 예: "프로 플랜 · 2026-12-31까지"
    summary = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "core"
        verbose_name = "admin action log"
        verbose_name_plural = "admin action logs"
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.get_action_display()} ({self.created_at:%Y-%m-%d %H:%M})"
