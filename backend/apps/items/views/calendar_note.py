from datetime import date

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.items.serializers import (
    CalendarNoteSerializer,
    CalendarNoteWriteSerializer,
    CalendarQuerySerializer,
)
from apps.items.services import delete_calendar_note, list_calendar_notes, upsert_calendar_note


class CalendarNoteListView(APIView):
    def get(self, request):
        query = CalendarQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)

        today = timezone.localdate()
        year = query.validated_data.get("year", today.year)
        month = query.validated_data.get("month", today.month)

        notes = list_calendar_notes(request.user, year=year, month=month)
        return Response(CalendarNoteSerializer(notes, many=True).data)


class CalendarNoteDetailView(APIView):
    def put(self, request, note_date: str):
        try:
            parsed_date = date.fromisoformat(note_date)
        except ValueError:
            return Response(
                {"detail": "날짜 형식이 올바르지 않습니다."}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CalendarNoteWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        note = upsert_calendar_note(
            request.user, note_date=parsed_date, content=serializer.validated_data["content"]
        )
        return Response(CalendarNoteSerializer(note).data)

    def delete(self, request, note_date: str):
        try:
            parsed_date = date.fromisoformat(note_date)
        except ValueError:
            return Response(
                {"detail": "날짜 형식이 올바르지 않습니다."}, status=status.HTTP_400_BAD_REQUEST
            )

        delete_calendar_note(request.user, note_date=parsed_date)
        return Response(status=status.HTTP_204_NO_CONTENT)
