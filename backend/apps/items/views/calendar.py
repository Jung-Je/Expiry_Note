from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.items.serializers import CalendarQuerySerializer, MonthlyCalendarSerializer
from apps.items.services import get_monthly_calendar


class ExpiryItemCalendarView(APIView):
    def get(self, request):
        query = CalendarQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)

        today = timezone.localdate()
        year = query.validated_data.get("year", today.year)
        month = query.validated_data.get("month", today.month)

        calendar = get_monthly_calendar(request.user, year=year, month=month)
        return Response(MonthlyCalendarSerializer(calendar).data)
