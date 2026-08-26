from django.core.management.base import BaseCommand

from apps.billing.services import renew_due_subscriptions


class Command(BaseCommand):
    """오늘 결제 예정일인 유료(베이직/프로) 구독을 갱신 청구하고, 해지 예약
    기간이 끝난 구독은 무료로 되돌린다.

    하루 한 번 스케줄러(runscheduler)로 실행하는 것을 전제로 한다.
    """

    help = "Charge paid subscriptions due for renewal today and downgrade expired cancellations."

    def handle(self, *args, **options):
        renewed = renew_due_subscriptions()
        self.stdout.write(self.style.SUCCESS(f"Renewed {len(renewed)} subscription(s)."))
