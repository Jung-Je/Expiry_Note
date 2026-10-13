"""관리자 대시보드(회원/구독/매출 요약)용 전체 서비스 집계.

items/services/stats.py와 같은 이유로 전부 DB 집계 쿼리로 구성한다 —
유저 수가 늘어도 Python 레벨 반복 없이 고정된 쿼리 수로 끝난다.
"""

from datetime import date, timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth

from apps.accounts.models import User
from apps.billing.models import Payment, Subscription
from apps.items.models import ExpiryItem
from apps.items.services.dates import add_months
from apps.support.models import Inquiry

SIGNUP_TREND_MONTHS = 6
# 관리자가 부여한 플랜이 이 일수 안에 끝나면 "곧 만료"로 센다.
GRANT_EXPIRING_SOON_DAYS = 7


def _monthly_signups(*, today: date) -> list[dict]:
    this_month_start = today.replace(day=1)
    range_start = add_months(this_month_start, -(SIGNUP_TREND_MONTHS - 1))

    rows = (
        User.objects.filter(date_joined__gte=range_start)
        .annotate(month=TruncMonth("date_joined"))
        .values("month")
        .annotate(count=Count("id"))
    )
    counts_by_month = {row["month"].strftime("%Y-%m"): row["count"] for row in rows}

    months = []
    for offset in range(SIGNUP_TREND_MONTHS):
        month_start = add_months(range_start, offset)
        key = month_start.strftime("%Y-%m")
        months.append({"month": key, "count": counts_by_month.get(key, 0)})
    return months


def _plan_distribution() -> dict[str, int]:
    # Subscription 행은 유저가 요금제 화면을 처음 열 때 지연 생성된다
    # (billing/services/subscription.py) — 아직 한 번도 안 열어본 유저는
    # Subscription이 없지만 실질적으론 무료 플랜이므로 free에 합산한다.
    sub_counts = dict(Subscription.objects.values_list("plan").annotate(count=Count("id")))
    users_without_subscription = User.objects.count() - Subscription.objects.count()
    return {
        Subscription.Plan.FREE: sub_counts.get(Subscription.Plan.FREE, 0)
        + users_without_subscription,
        Subscription.Plan.BASIC: sub_counts.get(Subscription.Plan.BASIC, 0),
        Subscription.Plan.PRO: sub_counts.get(Subscription.Plan.PRO, 0),
    }


def get_admin_overview(*, today: date | None = None) -> dict:
    today = today or date.today()
    this_month_start = today.replace(day=1)

    users_by_source = dict(User.objects.values_list("signup_source").annotate(count=Count("id")))
    revenue = Payment.objects.filter(status=Payment.Status.SUCCEEDED).aggregate(total=Sum("amount"))
    revenue_this_month = Payment.objects.filter(
        status=Payment.Status.SUCCEEDED, paid_at__gte=this_month_start
    ).aggregate(total=Sum("amount"))

    granted = Subscription.objects.filter(is_admin_granted=True)

    return {
        "users": {
            "total": User.objects.count(),
            "inactive": User.objects.filter(is_active=False).count(),
            "new_this_month": User.objects.filter(date_joined__gte=this_month_start).count(),
            "by_signup_source": {
                "email": users_by_source.get(User.SignupSource.EMAIL, 0),
                "kakao": users_by_source.get(User.SignupSource.KAKAO, 0),
                "google": users_by_source.get(User.SignupSource.GOOGLE, 0),
            },
            "monthly_signups": _monthly_signups(today=today),
        },
        "items": {
            "total": ExpiryItem.objects.count(),
        },
        "subscriptions": {
            "by_plan": _plan_distribution(),
            "admin_granted": granted.count(),
            # 종료일이 없는 부여(기간 제한 없음)는 만료되지 않으므로 빠진다.
            "grants_expiring_soon": granted.filter(
                current_period_end__gte=today,
                current_period_end__lte=today + timedelta(days=GRANT_EXPIRING_SOON_DAYS),
            ).count(),
        },
        "inquiries": {
            "unanswered": Inquiry.objects.filter(is_answered=False).count(),
        },
        "revenue": {
            "total": revenue["total"] or 0,
            "this_month": revenue_this_month["total"] or 0,
        },
    }
