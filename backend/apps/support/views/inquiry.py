from rest_framework import generics
from rest_framework.permissions import IsAdminUser

from apps.support.models import Inquiry
from apps.support.serializers import AdminInquirySerializer, InquirySerializer
from apps.support.services import create_inquiry


class InquiryListCreateView(generics.ListCreateAPIView):
    """유저 본인의 문의 목록 조회(GET) + 새 문의 작성(POST)."""

    serializer_class = InquirySerializer
    throttle_scope = "support-inquiry"

    def get_queryset(self):
        return Inquiry.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        inquiry = create_inquiry(user=self.request.user, **serializer.validated_data)
        serializer.instance = inquiry


class AdminInquiryListView(generics.ListAPIView):
    """관리자 화면의 문의 목록. 스태프 계정만 접근 가능."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminInquirySerializer
    queryset = Inquiry.objects.select_related("user").all()


class AdminInquiryDetailView(generics.RetrieveUpdateAPIView):
    """관리자 화면에서 문의 하나를 보고 답변(reply)을 등록/수정하는 엔드포인트."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminInquirySerializer
    queryset = Inquiry.objects.select_related("user").all()
