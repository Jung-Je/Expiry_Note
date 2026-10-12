from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.services import get_admin_overview


class AdminOverviewView(APIView):
    """관리자 대시보드 — 회원/매출/구독 현황 요약. 스태프 계정만 접근 가능."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(get_admin_overview())
