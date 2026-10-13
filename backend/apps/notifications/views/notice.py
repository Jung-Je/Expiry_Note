from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import AdminActionLog
from apps.core.services import record_admin_action
from apps.notifications.serializers import AdminNoticeSerializer
from apps.notifications.services import AUDIENCE_LABELS, send_notice


class AdminNoticeView(APIView):
    """관리자가 전체(또는 특정 플랜) 회원에게 공지 알림을 보낸다.

    보낸 공지는 되돌릴 수 없다. 누가 무엇을 보냈는지는 관리자 작업 기록에
    남는다(따로 공지 테이블을 두지 않는다).
    """

    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = AdminNoticeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        title = serializer.validated_data["title"]
        audience = serializer.validated_data["audience"]

        recipient_count = send_notice(
            title=title,
            message=serializer.validated_data["message"],
            audience=audience,
        )
        record_admin_action(
            actor=request.user,
            action=AdminActionLog.Action.NOTICE_SEND,
            summary=f"{title} · {AUDIENCE_LABELS[audience]} {recipient_count}명",
        )
        return Response({"recipient_count": recipient_count}, status=status.HTTP_201_CREATED)
