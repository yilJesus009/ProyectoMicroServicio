"""Django Admin: panel de administración (diferencial del proyecto).

Tras el hallazgo P1 del review, el registro público ya no puede autoasignar
el rol ADMIN: **este panel es el único camino de provisioning**. Por eso sus
pruebas no son opcionales — si el formulario está roto, nadie puede crear un
administrador.
"""
from django.test import Client, TestCase

from accounts.models import SupplierProfile, SupplierProfileStatus, User


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


class SupplierProfileAdminTests(TestCase):
    """`status` es solo lectura en el panel: el estado lo decide el
    servicio (API o acción de aprobar), nunca el formulario."""

    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@taller.com",
            password="clave-admin-123",
            nombre="Administrador",
        )
        self.client = Client()
        self.client.force_login(self.admin)
        self.proveedor = User.objects.create_user(
            email="proveedor@taller.com",
            password="clave-prov-123",
            nombre="Proveedor",
            rol="PROVEEDOR",
        )
        self.profile = SupplierProfile.objects.create(
            user=self.proveedor,
            business_name="Taller del Barrio",
            city="Santa Cruz",
            phone="70000000",
            category_ids=[1],
        )
        self.url = f"/admin/accounts/supplierprofile/{self.profile.id}/change/"

    def test_formulario_no_muestra_status_como_campo_editable(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        # Editable sería <select name="status">; solo lectura no lo tiene.
        self.assertNotContains(response, 'name="status"')

    def test_enviar_status_en_el_formulario_no_lo_modifica(self):
        response = self.client.post(
            self.url,
            {
                "user": self.proveedor.id,
                "business_name": "Taller del Barrio",
                "city": "Santa Cruz",
                "phone": "70000000",
                "category_ids": "[1]",
                "status": "APPROVED",
                "_save": "Guardar",
            },
        )

        self.assertEqual(response.status_code, 302)  # guardó sin status
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, SupplierProfileStatus.PENDING)
