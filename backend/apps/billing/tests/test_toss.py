"""토스페이먼츠 API 클라이언트 — 실제 네트워크 호출은 전부 모킹한다."""

import base64
from unittest.mock import patch

import pytest

from apps.billing.services.toss import TossAPIError, charge_billing_key, issue_billing_key


@pytest.fixture(autouse=True)
def _toss_secret_key(settings):
    settings.TOSS_SECRET_KEY = "test_sk_dummy"


def test_issue_billing_key_returns_the_billing_key():
    with patch("apps.billing.services.toss.requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"billingKey": "billing-key-123"}

        billing_key = issue_billing_key(auth_key="auth-key", customer_key="customer-1")

    assert billing_key == "billing-key-123"
    _, kwargs = mock_post.call_args
    assert kwargs["json"] == {"authKey": "auth-key", "customerKey": "customer-1"}
    # Basic 인증: "{secret_key}:"를 base64 인코딩한 값이어야 한다.
    expected = base64.b64encode(b"test_sk_dummy:").decode()
    assert kwargs["headers"]["Authorization"] == f"Basic {expected}"


def test_issue_billing_key_raises_on_failure():
    with patch("apps.billing.services.toss.requests.post") as mock_post:
        mock_post.return_value.status_code = 400
        mock_post.return_value.json.return_value = {
            "code": "INVALID_AUTH_KEY",
            "message": "인증 키가 유효하지 않습니다.",
        }

        with pytest.raises(TossAPIError) as exc_info:
            issue_billing_key(auth_key="bad-key", customer_key="customer-1")

    assert exc_info.value.code == "INVALID_AUTH_KEY"


def test_charge_billing_key_returns_response_body():
    with patch("apps.billing.services.toss.requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"paymentKey": "payment-key-1", "status": "DONE"}

        result = charge_billing_key(
            billing_key="billing-key-123",
            customer_key="customer-1",
            amount=2900,
            order_id="order-1",
            order_name="만료노트 프리미엄 월 구독",
        )

    assert result["paymentKey"] == "payment-key-1"
    called_url = mock_post.call_args[0][0]
    assert called_url.endswith("/billing/billing-key-123")
    assert mock_post.call_args.kwargs["json"]["amount"] == 2900


def test_charge_billing_key_raises_on_failure():
    with patch("apps.billing.services.toss.requests.post") as mock_post:
        mock_post.return_value.status_code = 400
        mock_post.return_value.json.return_value = {
            "code": "REJECT_CARD_PAYMENT",
            "message": "카드사에서 결제를 거절했습니다.",
        }

        with pytest.raises(TossAPIError):
            charge_billing_key(
                billing_key="billing-key-123",
                customer_key="customer-1",
                amount=2900,
                order_id="order-1",
                order_name="만료노트 프리미엄 월 구독",
            )
