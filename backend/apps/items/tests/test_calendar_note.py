from datetime import date

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.items.models import CalendarNote
from apps.items.services import delete_calendar_note, list_calendar_notes, upsert_calendar_note


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="owner@example.com", password="a-strong-pass-1", name="테스트"
    )


@pytest.fixture
def client(user):
    api_client = APIClient()
    api_client.force_authenticate(user=user)
    return api_client


class TestUpsertCalendarNote:
    @pytest.mark.django_db
    def test_creates_a_note(self, user):
        note = upsert_calendar_note(user, note_date=date(2026, 8, 5), content="병원 예약")

        assert note.content == "병원 예약"
        assert CalendarNote.objects.count() == 1

    @pytest.mark.django_db
    def test_overwrites_the_existing_note_on_the_same_date(self, user):
        upsert_calendar_note(user, note_date=date(2026, 8, 5), content="첫 메모")
        upsert_calendar_note(user, note_date=date(2026, 8, 5), content="바뀐 메모")

        assert CalendarNote.objects.count() == 1
        assert CalendarNote.objects.get().content == "바뀐 메모"


class TestListCalendarNotes:
    @pytest.mark.django_db
    def test_only_returns_notes_within_the_month(self, user):
        upsert_calendar_note(user, note_date=date(2026, 8, 5), content="8월")
        upsert_calendar_note(user, note_date=date(2026, 9, 1), content="9월")

        notes = list_calendar_notes(user, year=2026, month=8)

        assert [note.content for note in notes] == ["8월"]

    @pytest.mark.django_db
    def test_only_includes_current_users_notes(self, user):
        other = User.objects.create_user(
            email="other@example.com", password="a-strong-pass-1", name="다른유저"
        )
        upsert_calendar_note(other, note_date=date(2026, 8, 5), content="다른 사람 메모")

        notes = list_calendar_notes(user, year=2026, month=8)

        assert notes == []


class TestDeleteCalendarNote:
    @pytest.mark.django_db
    def test_deletes_the_note(self, user):
        upsert_calendar_note(user, note_date=date(2026, 8, 5), content="지울 메모")

        delete_calendar_note(user, note_date=date(2026, 8, 5))

        assert CalendarNote.objects.count() == 0

    @pytest.mark.django_db
    def test_deleting_a_nonexistent_note_does_not_error(self, user):
        delete_calendar_note(user, note_date=date(2026, 8, 5))  # no error


class TestCalendarNoteAPI:
    @pytest.mark.django_db
    def test_upserts_a_note_via_put(self, client):
        response = client.put(
            "/api/v1/items/calendar/notes/2026-08-05/", {"content": "병원 예약"}, format="json"
        )

        assert response.status_code == 200
        assert response.data["content"] == "병원 예약"
        assert response.data["date"] == "2026-08-05"

    @pytest.mark.django_db
    def test_rejects_an_invalid_date(self, client):
        response = client.put(
            "/api/v1/items/calendar/notes/not-a-date/", {"content": "메모"}, format="json"
        )
        assert response.status_code == 400

    @pytest.mark.django_db
    def test_deletes_a_note(self, client, user):
        upsert_calendar_note(user, note_date=date(2026, 8, 5), content="메모")

        response = client.delete("/api/v1/items/calendar/notes/2026-08-05/")

        assert response.status_code == 204
        assert CalendarNote.objects.count() == 0

    @pytest.mark.django_db
    def test_lists_notes_for_the_requested_month(self, client, user):
        upsert_calendar_note(user, note_date=date(2026, 8, 5), content="8월 메모")

        response = client.get("/api/v1/items/calendar/notes/", {"year": 2026, "month": 8})

        assert response.status_code == 200
        assert response.data[0]["content"] == "8월 메모"

    @pytest.mark.django_db
    def test_requires_authentication(self):
        response = APIClient().get("/api/v1/items/calendar/notes/")
        assert response.status_code == 401
