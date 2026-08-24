"""배포 플랫폼과 무관하게 알림 생성/토큰 정리를 주기적으로 실행하는 워커.

manage.py runserver(웹 프로세스)와는 별개로, 이 커맨드 하나를 독립된
장기 실행 프로세스로 띄우면 된다 — Docker의 별도 서비스, systemd 유닛,
Heroku/Render 같은 곳의 worker 프로세스, 그냥 서버에서 `nohup ... &`로
띄워도 전부 동일하게 동작한다. 시스템 cron에 기능이 얽매이지 않아 배포
플랫폼이 뭐로 정해지든 그대로 쓸 수 있다(플랫폼이 자체 cron 기능을
제공하면 대신 `generate_notifications`/`flushexpiredtokens`를 직접
스케줄링해도 되고, 이 워커를 안 띄워도 무방하다).
"""

import logging

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import close_old_connections

logger = logging.getLogger(__name__)


def _run_command(name: str) -> None:
    """스케줄러 스레드에서 management command를 실행한다.

    실패해도 스케줄러 자체는 죽지 않고 다음 스케줄에 다시 시도한다. 이
    프로세스는 요청/응답 주기가 없어서 Django가 알아서 오래된 DB 커넥션을
    정리해주지 않으므로, 매 실행 뒤 직접 정리한다.
    """
    try:
        call_command(name)
    except Exception:
        logger.exception("scheduled command '%s' failed", name)
    finally:
        close_old_connections()


class Command(BaseCommand):
    help = (
        "generate_notifications/flushexpiredtokens을 주기적으로 실행하는 "
        "독립 워커 프로세스를 시작한다(Ctrl+C로 종료)."
    )

    def handle(self, *args, **options):
        scheduler = BlockingScheduler(timezone=settings.TIME_ZONE)

        # 매일 오전 9시 — 오늘이 만료 D-day(notify_days_before)인 항목의
        # 인앱 알림을 생성한다. 여러 번 실행해도 항목+만료일 조합으로는
        # 중복 생성되지 않는다(Notification의 unique_together).
        scheduler.add_job(
            _run_command,
            args=["generate_notifications"],
            trigger=CronTrigger(hour=9, minute=0),
            id="generate_notifications",
            misfire_grace_time=3600,
        )

        # 매주 월요일 새벽 3시 — 만료된 JWT 블랙리스트/outstanding 토큰 정리.
        scheduler.add_job(
            _run_command,
            args=["flushexpiredtokens"],
            trigger=CronTrigger(day_of_week="mon", hour=3, minute=0),
            id="flushexpiredtokens",
            misfire_grace_time=3600,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"스케줄러 시작 (timezone={settings.TIME_ZONE}) — "
                "generate_notifications 매일 09:00, "
                "flushexpiredtokens 매주 월요일 03:00. Ctrl+C로 종료."
            )
        )
        try:
            scheduler.start()
        except (KeyboardInterrupt, SystemExit):
            self.stdout.write("스케줄러 종료.")
