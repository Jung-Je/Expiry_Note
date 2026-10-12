"""관리자 대시보드(회원/구독/매출 요약)용 전체 서비스 집계.

items/services/stats.py와 같은 이유로 전부 DB 집계 쿼리로 구성한다 —
유저 수가 늘어도 Python 레벨 반복 없이 고정된 쿼리 수(6개)로 끝난다.
"""

from datetime import date

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth

from apps.accounts.models import User
from apps.billing.models import Payment, Subscription
from apps.items.models import ExpiryItem
from apps.items.services.dates import add_months

SIGNUP_TREND_MONTHS = 6


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

    return {
        "users": {
            "total": User.objects.count(),
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
        },
        "revenue": {
            "total": revenue["total"] or 0,
            "this_month": revenue_this_month["total"] or 0,
        },
    }
