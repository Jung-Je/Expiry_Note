from datetime import date


def add_months(day: date, months: int) -> date:
    """First day of the month that is `months` after `day`'s month.

    `months` may be negative. Shared by the stats and calendar services so
    both aggregate over identical month boundaries.
    """
    month_index = day.month - 1 + months
    year = day.year + month_index // 12
    month = month_index % 12 + 1
    return day.replace(year=year, month=month, day=1)
