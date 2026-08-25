from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.support.serializers import InquirySerializer
from apps.support.services import create_inquiry


class InquiryCreateView(APIView):
    throttle_scope = "support-inquiry"

    def post(self, request):
        serializer = InquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inquiry = create_inquiry(user=request.user, **serializer.validated_data)
        return Response(InquirySerializer(inquiry).data, status=status.HTTP_201_CREATED)
