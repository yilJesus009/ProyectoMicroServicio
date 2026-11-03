"""Django Admin: panel de administración (diferencial del proyecto).

Tras el hallazgo P1 del review, el registro público ya no puede autoasignar
el rol ADMIN: **este panel es el único camino de provisioning**. Por eso sus
pruebas no son opcionales — si el formulario está roto, nadie puede crear un
administrador.
"""
from django.test import Client, TestCase

from accounts.models import User


class AdminPanelTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@taller.com",
            password="clave-admin-123",
            nombre="Administrador",
        )
        self.client = Client()
        self.client.force_login(self.admin)

    def test_panel_accesible_para_el_superuser(self):
        response = self.client.get("/admin/")

        self.assertEqual(response.status_code, 200)

    def test_formulario_agregar_usuario_accesible(self):
        """El form usa nuestro modelo (AUTH_USER_MODEL cambiado), no el de
        django.contrib.auth: si fallara, no habría forma de crear un ADMIN."""
        response = self.client.get("/admin/accounts/user/add/")

        self.assertEqual(response.status_code, 200)

    def test_admin_puede_crear_un_usuario_con_rol_admin(self):
        response = self.client.post(
            "/admin/accounts/user/add/",
            {
                "email": "operador@taller.com",
                "nombre": "Operador",
                "rol": "ADMIN",
                "password1": "clave-operador-456",
                "password2": "clave-operador-456",
                "_save": "Guardar",
            },
        )

        self.assertEqual(response.status_code, 302)  # redirige tras guardar
        nuevo = User.objects.get(email="operador@taller.com")
        self.assertEqual(nuevo.rol, "ADMIN")
        self.assertTrue(nuevo.check_password("clave-operador-456"))
