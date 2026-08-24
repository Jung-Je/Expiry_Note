"""runscheduler 커맨드 — 실제 스케줄러를 몇 분/며칠씩 기다릴 수는 없으니,
잡이 올바르게 등록되는지와 잡 실행 래퍼(_run_command)가 실패해도 스케줄러를
죽이지 않는지를 검증한다.
"""

from unittest.mock import patch

import pytest
from django.core.management import call_command

from apps.core.management.commands.runscheduler import _run_command


@pytest.mark.django_db
def test_run_command_executes_the_given_management_command():
    with patch("apps.core.management.commands.runscheduler.call_command") as mock_call:
        _run_command("generate_notifications")

    mock_call.assert_called_once_with("generate_notifications")


@pytest.mark.django_db
def test_run_command_swallows_exceptions_so_the_scheduler_keeps_running():
    # 예외가 여기서 새어나가면 APScheduler 워커 스레드가 죽는다 — 다음
    # 스케줄까지 통째로 못 도니까, 실패해도 여기서 삼키고 로그만 남긴다.
    with patch(
        "apps.core.management.commands.runscheduler.call_command",
        side_effect=RuntimeError("boom"),
    ):
        _run_command("flushexpiredtokens")  # 예외를 던지지 않아야 통과


def test_run_command_closes_old_db_connections_after_running():
    # 이 프로세스는 요청 주기가 없어서 Django가 알아서 커넥션을 안 닫아준다.
    with (
        patch("apps.core.management.commands.runscheduler.call_command"),
        patch("apps.core.management.commands.runscheduler.close_old_connections") as mock_close,
    ):
        _run_command("generate_notifications")

    mock_close.assert_called_once()


def test_runscheduler_registers_all_three_jobs():
    with patch(
        "apps.core.management.commands.runscheduler.BlockingScheduler"
    ) as mock_scheduler_cls:
        mock_scheduler = mock_scheduler_cls.return_value
        # start()가 즉시 리턴되게 해서 테스트가 영원히 안 기다리게 한다 —
        # 실제 운영에서 Ctrl+C로 종료할 때와 같은 경로(handle()이 잡아서
        # 조용히 끝남).
        mock_scheduler.start.side_effect = KeyboardInterrupt

        call_command("runscheduler")

    job_ids = {call.kwargs["id"] for call in mock_scheduler.add_job.call_args_list}
    assert job_ids == {"renew_subscriptions", "generate_notifications", "flushexpiredtokens"}
    mock_scheduler.start.assert_called_once()
