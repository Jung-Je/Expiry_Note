from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps._template.serializers import ExampleSerializer
from apps._template.services import create_example


@api_view(["POST"])
def create_example_view(request):
    serializer = ExampleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    example = create_example(**serializer.validated_data)
    return Response(ExampleSerializer(example).data, status=status.HTTP_201_CREATED)
