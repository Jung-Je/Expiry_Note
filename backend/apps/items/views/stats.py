from rest_framework.response import Response
from rest_framework.views import APIView

from apps.items.services import get_item_stats


class ExpiryItemStatsView(APIView):
    def get(self, request):
        return Response(get_item_stats(request.user))
