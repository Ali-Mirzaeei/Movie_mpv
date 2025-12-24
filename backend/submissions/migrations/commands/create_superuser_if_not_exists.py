from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()

class Command(BaseCommand):
    def handle(self, *args, **options):
        username = os.getenv("DJANGO_SUPERUSER_USERNAME")
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD")
        email = os.getenv("DJANGO_SUPERUSER_EMAIL")

        if not username or not password:
            print("Superuser env vars not set")
            return

        if User.objects.filter(username=username).exists():
            print("Superuser already exists")
            return

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )

        print("Superuser created")
