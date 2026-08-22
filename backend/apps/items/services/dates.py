from datetime import date


def add_months(day: date, months: int) -> date:
    """`day`가 속한 달로부터 `months`만큼 뒤(음수면 앞) 달의 1일.

    stats·calendar 서비스가 함께 쓴다 — 둘 다 같은 월 경계 기준으로
    집계해야 하기 때문이다.
    """
    month_index = day.month - 1 + months
    year = day.year + month_index // 12
    month = month_index % 12 + 1
    return day.replace(year=year, month=month, day=1)
