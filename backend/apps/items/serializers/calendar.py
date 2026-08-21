from rest_framework import serializers

from apps.items.serializers.expiry_item import ExpiryItemSerializer


class CalendarQuerySerializer(serializers.Serializer):
    year = serializers.IntegerField(min_value=1970, max_value=9999, required=False)
    month = serializers.IntegerField(min_value=1, max_value=12, required=False)


class CalendarDaySerializer(serializers.Serializer):
    date = serializers.DateField()
    items = ExpiryItemSerializer(many=True)


class MonthlyCalendarSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    days = CalendarDaySerializer(many=True)
