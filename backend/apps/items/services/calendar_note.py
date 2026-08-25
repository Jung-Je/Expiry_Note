"""일정 화면 달력의 날짜별 자유 메모(CalendarNote) 관리."""

from datetime import date

from apps.items.models import CalendarNote
from apps.items.services.dates import add_months


def list_calendar_notes(user, *, year: int, month: int) -> list[CalendarNote]:
    month_start = date(year, month, 1)
    month_end = add_months(month_start, 1)
    return list(
        CalendarNote.objects.filter(user=user, date__gte=month_start, date__lt=month_end).order_by(
            "date"
        )
    )


def upsert_calendar_note(user, *, note_date: date, content: str) -> CalendarNote:
    note, _ = CalendarNote.objects.update_or_create(
        user=user, date=note_date, defaults={"content": content}
    )
    return note


def delete_calendar_note(user, *, note_date: date) -> None:
    CalendarNote.objects.filter(user=user, date=note_date).delete()
