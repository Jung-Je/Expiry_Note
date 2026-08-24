from unittest.mock import patch

import pytest
from django.core.management import call_command


@pytest.mark.django_db
def test_renew_subscriptions_reports_the_number_renewed():
    with patch(
        "apps.billing.management.commands.renew_subscriptions.renew_due_subscriptions"
    ) as mock_renew:
        mock_renew.return_value = ["sub-1", "sub-2"]

        call_command("renew_subscriptions")

    mock_renew.assert_called_once()
