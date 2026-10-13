from rest_framework import generics
from rest_framework.permissions import IsAdminUser

from apps.core.models import AdminActionLog
from apps.core.pagination import AdminPagination
from apps.core.services import record_admin_action
from apps.support.models import Inquiry
from apps.support.serializers import AdminInquirySerializer, InquirySerializer
from apps.support.services import create_inquiry


class InquiryListCreateView(generics.ListCreateAPIView):
    """유저 본인의 문의 목록 조회(GET) + 새 문의 작성(POST).

    throttle_scope(지금은 5/hour)은 스팸성 문의 작성을 막기 위한 거라
    POST에만 걸어야 한다 — GET까지 걸리면 설정 > 문의 탭을 몇 번만 다시
    열어도 본인 문의 목록 조회 자체가 429로 막혀버린다.
    """

    serializer_class = InquirySerializer
    throttle_scope = "support-inquiry"

    def get_throttles(self):
        if self.request.method != "POST":
            return []
        return super().get_throttles()

    def get_queryset(self):
        return Inquiry.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        inquiry = create_inquiry(user=self.request.user, **serializer.validated_data)
        serializer.instance = inquiry


class AdminInquiryListView(generics.ListAPIView):
    """관리자 화면의 문의 목록. 스태프 계정만 접근 가능.

    `?answered=true|false`(답변 여부)와 `?category=`로 좁힐 수 있다.
    모르는 값은 무시한다.
    """

    permission_classes = [IsAdminUser]
    serializer_class = AdminInquirySerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        queryset = Inquiry.objects.select_related("user").order_by("-created_at", "-id")
        params = self.request.query_params

        answered = (params.get("answered") or "").lower()
        if answered in ("1", "true"):
            queryset = queryset.filter(is_answered=True)
        elif answered in ("0", "false"):
            queryset = queryset.filter(is_answered=False)

        category = params.get("category")
        if category in Inquiry.Category.values:
            queryset = queryset.filter(category=category)

        return queryset


class AdminInquiryDetailView(generics.RetrieveUpdateAPIView):
    """관리자 화면에서 문의 하나를 보고 답변(reply)을 등록/수정하는 엔드포인트."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminInquirySerializer
    queryset = Inquiry.objects.select_related("user").all()

    def perform_update(self, serializer):
        previous_reply = serializer.instance.reply
        inquiry = serializer.save()
        # 답변 내용이 실제로 바뀐 경우만 기록한다(처음 등록 + 이후 수정 모두).
        if inquiry.reply != previous_reply:
            record_admin_action(
                actor=self.request.user,
                action=AdminActionLog.Action.INQUIRY_REPLY,
                target_user=inquiry.user,
                summary=inquiry.title,
            )
