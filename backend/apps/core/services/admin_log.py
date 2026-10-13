"""관리자 작업 기록 남기기.

각 앱의 관리자 뷰가 실제 변경을 마친 직후에 부른다 — 변경이 실패하면
기록도 남지 않는다.
"""

from apps.accounts.models import User
from apps.core.models import AdminActionLog

_SUMMARY_MAX_LENGTH = AdminActionLog._meta.get_field("summary").max_length


def record_admin_action(
    *,
    actor: User,
    action: str,
    target_user: User | None = None,
    summary: str = "",
) -> AdminActionLog:
    return AdminActionLog.objects.create(
        actor=actor,
        action=action,
        target_user=target_user,
        summary=summary[:_SUMMARY_MAX_LENGTH],
    )
