from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.support.models import Inquiry
from apps.support.serializers import AdminInquirySerializer, InquirySerializer
from apps.support.services import create_inquiry


class InquiryCreateView(APIView):
    throttle_scope = "support-inquiry"

    def post(self, request):
        serializer = InquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inquiry = create_inquiry(user=request.user, **serializer.validated_data)
        return Response(InquirySerializer(inquiry).data, status=status.HTTP_201_CREATED)


class AdminInquiryListView(generics.ListAPIView):
    """관리자 화면의 문의 목록. 스태프 계정만 접근 가능."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminInquirySerializer
    queryset = Inquiry.objects.select_related("user").all()


class AdminInquiryDetailView(generics.RetrieveUpdateAPIView):
    """관리자 화면에서 문의 하나를 보고 is_answered만 바꿀 수 있는 엔드포인트."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminInquirySerializer
    queryset = Inquiry.objects.select_related("user").all()
