from rest_framework import serializers

from apps._template.models import ExampleModel


class ExampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExampleModel
        fields = ["id", "name"]
