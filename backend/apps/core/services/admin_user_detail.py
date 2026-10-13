"""관리자 화면의 회원 상세 — 한 회원에 대해 여러 앱에 흩어진 정보를 모은다.

문의에 답하거나 플랜을 바꾸기 전에 "이 회원이 지금 어떤 상태인지"를 한
화면에서 보려는 용도라, 목록은 전부가 아니라 최근 몇 건만 내려준다.
"""

from apps.accounts.models import User
from apps.billing.models import Payment
from apps.core.models import AdminActionLog
from apps.items.models import ExpiryItem
from apps.support.models import Inquiry

RECENT_PAYMENTS_LIMIT = 10
RECENT_INQUIRIES_LIMIT = 10
RECENT_LOGS_LIMIT = 20


def get_admin_user_detail(user: User) -> dict:
    return {
        "user": user,
        "item_count": ExpiryItem.objects.filter(user=user).count(),
        "payments": Payment.objects.filter(subscription__user=user).select_related(
            "subscription__user"
        )[:RECENT_PAYMENTS_LIMIT],
        "inquiries": Inquiry.objects.filter(user=user).select_related("user")[
            :RECENT_INQUIRIES_LIMIT
        ],
        "logs": AdminActionLog.objects.filter(target_user=user).select_related(
            "actor", "target_user"
        )[:RECENT_LOGS_LIMIT],
    }
