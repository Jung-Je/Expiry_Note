from django.core.management.base import BaseCommand

from apps.notifications.services import generate_due_notifications


class Command(BaseCommand):
    """항목의 notify_days_before가 오늘과 맞아떨어지는 항목의 알림을 생성한다.

    하루 한 번 스케줄러(cron 등)로 실행하는 것을 전제로 한다. 여러 번 실행해도
    같은 항목·같은 만료일에는 알림이 중복 생성되지 않는다.
    """

    help = "Create in-app notifications for items whose notify_days_before matches today."

    def handle(self, *args, **options):
        created = generate_due_notifications()
        self.stdout.write(self.style.SUCCESS(f"Created {len(created)} notification(s)."))
