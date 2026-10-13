from rest_framework.pagination import PageNumberPagination


class AdminPagination(PageNumberPagination):
    """관리자 화면 목록 공통 페이지 나누기.

    일반 유저용 목록(내 항목, 내 알림)은 건수가 요금제로 제한돼 한 번에
    내려줘도 되지만, 관리자 목록은 전체 회원이 대상이라 계속 늘어난다.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_page_number(self, request, paginator):
        """범위를 벗어난 페이지는 404 대신 가장 가까운 페이지로 맞춘다.

        마지막 페이지에 한 건만 남은 상태에서 그 건이 필터에서 빠지면(예:
        미답변 문의에 답변) 보고 있던 페이지 번호가 사라진다 — 그때 화면이
        오류로 바뀌지 않고 남은 마지막 페이지를 보여주게 한다.
        """
        raw = request.query_params.get(self.page_query_param, 1)
        try:
            number = int(raw)
        except (TypeError, ValueError):
            return 1
        return min(max(number, 1), paginator.num_pages)
