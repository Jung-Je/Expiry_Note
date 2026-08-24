"""토스페이먼츠 자동결제(빌링) REST API 클라이언트.

프론트는 토스 JS SDK(payment.requestBillingAuth())로 카드 등록 화면만
띄우고, 그 결과로 받은 authKey를 우리 백엔드에 넘긴다. authKey를
billingKey로 교환하는 것과, billingKey로 실제 결제를 청구하는 것은
전부 여기 백엔드에서 한다 — TOSS_SECRET_KEY는 절대 프론트로 넘기면
안 되는 값이라서다.

https://docs.tosspayments.com/reference (자동결제 관련 엔드포인트)
"""

import base64

import requests
from django.conf import settings

TOSS_API_BASE = "https://api.tosspayments.com/v1"


class TossAPIError(Exception):
    """토스 API가 실패 응답(2xx가 아님)을 준 경우."""

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message)
        self.code = code


def _auth_header() -> dict:
    # 토스 인증 방식: "{secretKey}:"를 base64 인코딩해 Basic 인증으로 보낸다.
    encoded = base64.b64encode(f"{settings.TOSS_SECRET_KEY}:".encode()).decode()
    return {"Authorization": f"Basic {encoded}"}


def issue_billing_key(*, auth_key: str, customer_key: str) -> str:
    """카드 등록 인증이 끝난 뒤 받은 authKey를 billingKey로 교환한다."""
    response = requests.post(
        f"{TOSS_API_BASE}/billing/authorizations/issue",
        json={"authKey": auth_key, "customerKey": customer_key},
        headers=_auth_header(),
        timeout=10,
    )
    body = response.json()
    if response.status_code != 200:
        raise TossAPIError(body.get("message", "빌링키 발급에 실패했습니다."), body.get("code"))
    return body["billingKey"]


def charge_billing_key(
    *,
    billing_key: str,
    customer_key: str,
    amount: int,
    order_id: str,
    order_name: str,
    customer_email: str | None = None,
) -> dict:
    """billingKey로 실제 결제를 청구한다. 최초 결제와 매달 자동 갱신 결제 둘 다 이걸 쓴다."""
    payload = {
        "customerKey": customer_key,
        "amount": amount,
        "orderId": order_id,
        "orderName": order_name,
    }
    if customer_email:
        payload["customerEmail"] = customer_email

    response = requests.post(
        f"{TOSS_API_BASE}/billing/{billing_key}",
        json=payload,
        headers=_auth_header(),
        # 토스 문서: 자동결제 승인은 최대 60초가 걸릴 수 있으니 타임아웃을
        # 최소 60초로 두라고 안내함.
        timeout=65,
    )
    body = response.json()
    if response.status_code != 200:
        raise TossAPIError(body.get("message", "결제 승인에 실패했습니다."), body.get("code"))
    return body
