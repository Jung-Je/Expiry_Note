from rest_framework import serializers

from apps.items.models import ExpiryItem


class ExpiryItemSerializer(serializers.ModelSerializer):
    days_until_expiry = serializers.IntegerField(read_only=True)
    status = serializers.ChoiceField(choices=ExpiryItem.Status.choices, read_only=True)

    class Meta:
        model = ExpiryItem
        fields = [
            "id",
            "title",
            "category",
            "expiry_date",
            "amount",
            "memo",
            "days_until_expiry",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
