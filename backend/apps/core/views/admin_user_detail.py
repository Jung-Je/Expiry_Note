from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.core.serializers import AdminUserDetailSerializer
from apps.core.services import get_admin_user_detail


class AdminUserDetailSummaryView(APIView):
    """회원 한 명의 등록 항목 수·결제·문의·관리자 작업 이력을 한 번에 내려준다.

    계정 상태 변경(auth/admin/users/<id>/)이나 플랜 부여
    (billing/admin/users/<id>/subscription/)는 각 앱의 엔드포인트가 맡고,
    여기는 여러 앱에 걸친 조회만 한다.
    """

    permission_classes = [IsAdminUser]

    def get(self, request, user_id: int):
        user = get_object_or_404(User.objects.select_related("subscription"), pk=user_id)
        return Response(AdminUserDetailSerializer(get_admin_user_detail(user)).data)
