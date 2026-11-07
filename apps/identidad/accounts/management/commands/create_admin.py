"""Crea el administrador inicial si no existe (arranque en Docker).

docs/contratos-api.md: «El admin se crea por comando o semilla, nunca desde
el registro público». En Docker lo invoca docker-entrypoint.sh después de
`migrate`, con las variables ADMIN_EMAIL y ADMIN_PASSWORD de .env.example.
"""
import os

from django.core.management.base import BaseCommand

from accounts.models import Role, User


class Command(BaseCommand):
    help = (
        "Crea el administrador inicial a partir de ADMIN_EMAIL y "
        "ADMIN_PASSWORD si todavía no existe."
    )

    def handle(self, *args, **options):
        email = (os.environ.get("ADMIN_EMAIL") or "").strip()
        password = os.environ.get("ADMIN_PASSWORD") or ""

        if not email or not password:
            self.stdout.write(
                "ADMIN_EMAIL o ADMIN_PASSWORD no definidos: "
                "no se crea ningún administrador."
            )
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(f"El administrador {email} ya existe.")
            return

        User.objects.create_superuser(
            email=email,
            password=password,  # se hashea con bcrypt_sha256 (settings.py)
            nombre="Administrador",
            rol=Role.ADMIN,
        )
        self.stdout.write(self.style.SUCCESS(f"Administrador creado: {email}"))
