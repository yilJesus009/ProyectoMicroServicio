"""Perfil comercial del proveedor y su aprobación (Fase 2, bloque B1).

Contrato: docs/contratos-api.md (Identidad) y payloads de docs/eventos.md.
Las publicaciones usan transaction.on_commit, por eso se ejecutan dentro de
`captureOnCommitCallbacks(execute=True)` (en un TestCase el commit no llega
nunca).
"""
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.exceptions import SupplierAlreadyReviewedException
from accounts.models import (
    SupplierProfile,
    SupplierProfileStatus,
    User,
)
from accounts.services import supplier_service

SUPPLIERS_URL = "/api/v1/suppliers/me"
ADMIN_SUPPLIERS_URL = "/api/v1/admin/suppliers"

BODY_OK = {
    "business_name": "AutoParts Center",
    "city": "Santa Cruz",
    "phone": "70000000",
    "category_ids": [1, 3],
}


def _token_for(user: User) -> str:
    """Mismas claims que emite auth_service.login (user_id, rol, email)."""
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token
    for token in (refresh, access):
        token["user_id"] = user.id
        token["rol"] = user.rol
        token["email"] = user.email
    return str(access)


class SupplierTestCase(TestCase):
    """Base: los tres roles, el cliente y un helper de autenticación."""

    def setUp(self):
        self.client = APIClient()
        self.proveedor = User.objects.create_user(
            email="proveedor@taller.com",
            password="secreto123",
            nombre="Mecánico López",
            rol="PROVEEDOR",
        )
        self.comprador = User.objects.create_user(
            email="comprador@taller.com",
            password="secreto123",
            nombre="Carla Compra",
            rol="COMPRADOR",
        )
        self.admin = User.objects.create_superuser(
            email="admin@taller.com",
            password="clave-admin-123",
            nombre="Administrador",
        )

    def auth_as(self, user: User):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token_for(user)}")

    def make_profile(self, *, user=None, status=SupplierProfileStatus.PENDING, **extra):
        defaults = {
            "business_name": "Taller del Barrio",
            "city": "Cochabamba",
            "phone": "60000000",
            "category_ids": [2],
            "status": status,
        }
        defaults.update(extra)
        return SupplierProfile.objects.create(user=user or self.proveedor, **defaults)


class SupplierMeTests(SupplierTestCase):
    """GET/PUT /api/v1/suppliers/me — 🏪 solo PROVEEDOR."""

    def test_get_sin_perfil_devuelve_404_envelope(self):
        self.auth_as(self.proveedor)

        response = self.client.get(SUPPLIERS_URL)

        self.assertEqual(response.status_code, 404)
        body = response.json()
        self.assertEqual(body["status"], 404)
        self.assertIn("perfil comercial", body["msg"])

    def test_get_sin_token_devuelve_401(self):
        response = self.client.get(SUPPLIERS_URL)

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["status"], 401)

    def test_comprador_no_tiene_acceso_al_endpoint_de_proveedor(self):
        self.auth_as(self.comprador)

        response = self.client.get(SUPPLIERS_URL)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["status"], 403)

    def test_put_crea_el_perfil_en_estado_pending(self):
        self.auth_as(self.proveedor)

        response = self.client.put(SUPPLIERS_URL, BODY_OK, format="json")

        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["status"], "PENDING")
        self.assertEqual(data["business_name"], "AutoParts Center")
        self.assertEqual(data["city"], "Santa Cruz")
        self.assertEqual(data["phone"], "70000000")
        self.assertEqual(data["category_ids"], [1, 3])
        self.assertEqual(data["user_id"], self.proveedor.id)
        profile = SupplierProfile.objects.get(user=self.proveedor)
        self.assertEqual(profile.status, SupplierProfileStatus.PENDING)

    def test_put_publica_supplier_profile_submitted_tras_el_commit(self):
        self.auth_as(self.proveedor)

        with patch("accounts.events.publisher.publish") as mock_publish:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.put(SUPPLIERS_URL, BODY_OK, format="json")

        self.assertEqual(response.status_code, 200)
        mock_publish.assert_called_once()
        kwargs = mock_publish.call_args.kwargs
        self.assertEqual(kwargs["topic"], "identity_events")
        self.assertEqual(kwargs["event_name"], "SUPPLIER_PROFILE_SUBMITTED")
        self.assertEqual(
            kwargs["payload"],
            {"supplier_id": response.json()["data"]["user_id"],
             "business_name": "AutoParts Center"},
        )

    def test_put_sobre_perfil_aprobado_vuelve_a_pending_y_borra_la_decision(self):
        """Regla del contrato: CADA PUT vuelve a PENDIENTE."""
        profile = self.make_profile(
            status=SupplierProfileStatus.APPROVED,
            rejection_reason="antes estuvo rechazado",
            reviewed_by=self.admin,
        )
        self.auth_as(self.proveedor)

        response = self.client.put(SUPPLIERS_URL, BODY_OK, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["status"], "PENDING")
        profile.refresh_from_db()
        self.assertEqual(profile.status, SupplierProfileStatus.PENDING)
        self.assertIsNone(profile.rejection_reason)
        self.assertIsNone(profile.reviewed_by)
        self.assertIsNone(profile.reviewed_at)
        self.assertEqual(profile.business_name, "AutoParts Center")

    def test_put_sin_category_ids_devuelve_400(self):
        self.auth_as(self.proveedor)
        body = {k: v for k, v in BODY_OK.items() if k != "category_ids"}

        response = self.client.put(SUPPLIERS_URL, body, format="json")

        self.assertEqual(response.status_code, 400)
        body_json = response.json()
        self.assertEqual(body_json["status"], 400)
        self.assertIn("errors", body_json["data"])

    def test_put_con_category_ids_vacio_devuelve_400(self):
        self.auth_as(self.proveedor)
        body = {**BODY_OK, "category_ids": []}

        response = self.client.put(SUPPLIERS_URL, body, format="json")

        self.assertEqual(response.status_code, 400)


class AdminSuppliersListTests(SupplierTestCase):
    """🛡️ GET /api/v1/admin/suppliers?status= — solo ADMIN."""

    def test_proveedor_no_puede_listar_perfiles(self):
        self.make_profile()
        self.auth_as(self.proveedor)

        response = self.client.get(ADMIN_SUPPLIERS_URL)

        self.assertEqual(response.status_code, 403)

    def test_comprador_no_puede_listar_perfiles(self):
        self.auth_as(self.comprador)

        response = self.client.get(ADMIN_SUPPLIERS_URL)

        self.assertEqual(response.status_code, 403)

    def test_admin_lista_todos_los_perfiles(self):
        self.make_profile(status=SupplierProfileStatus.PENDING)
        otro_user = User.objects.create_user(
            email="otro@taller.com",
            password="secreto123",
            nombre="Otro Proveedor",
            rol="PROVEEDOR",
        )
        self.make_profile(
            user=otro_user, status=SupplierProfileStatus.APPROVED
        )
        self.auth_as(self.admin)

        response = self.client.get(ADMIN_SUPPLIERS_URL)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["data"]), 2)

    def test_admin_filtra_por_estado(self):
        self.make_profile(status=SupplierProfileStatus.PENDING)
        otro_user = User.objects.create_user(
            email="aprobado@taller.com",
            password="secreto123",
            nombre="Aprobado",
            rol="PROVEEDOR",
        )
        self.make_profile(user=otro_user, status=SupplierProfileStatus.APPROVED)
        self.auth_as(self.admin)

        response = self.client.get(f"{ADMIN_SUPPLIERS_URL}?status=PENDING")

        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["status"], "PENDING")

    def test_estado_de_filtro_invalido_devuelve_400(self):
        self.auth_as(self.admin)

        response = self.client.get(f"{ADMIN_SUPPLIERS_URL}?status=OTRA_COSA")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["status"], 400)


class AdminSupplierDecisionTests(SupplierTestCase):
    """🛡️ POST .../approve y .../reject."""

    def approve_url(self, profile):
        return f"{ADMIN_SUPPLIERS_URL}/{profile.id}/approve"

    def reject_url(self, profile):
        return f"{ADMIN_SUPPLIERS_URL}/{profile.id}/reject"

    def test_aprobar_cambia_el_estado_y_registra_quien_decidio(self):
        profile = self.make_profile()
        self.auth_as(self.admin)

        response = self.client.post(self.approve_url(profile))

        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["status"], "APPROVED")
        self.assertEqual(data["reviewed_by"], self.admin.id)
        self.assertIsNotNone(data["reviewed_at"])
        profile.refresh_from_db()
        self.assertEqual(profile.status, SupplierProfileStatus.APPROVED)

    def test_aprobar_publica_supplier_approved_con_ciudad_y_categorias(self):
        profile = self.make_profile(category_ids=[1, 3], city="Santa Cruz")
        self.auth_as(self.admin)

        with patch("accounts.events.publisher.publish") as mock_publish:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(self.approve_url(profile))

        self.assertEqual(response.status_code, 200)
        mock_publish.assert_called_once()
        kwargs = mock_publish.call_args.kwargs
        self.assertEqual(kwargs["topic"], "identity_events")
        self.assertEqual(kwargs["event_name"], "SUPPLIER_APPROVED")
        self.assertEqual(
            kwargs["payload"],
            {
                "supplier_id": profile.user_id,
                "business_name": "Taller del Barrio",
                "city": "Santa Cruz",
                "category_ids": [1, 3],
            },
        )

    def test_aprobar_dos_veces_devuelve_409(self):
        profile = self.make_profile()
        self.auth_as(self.admin)
        self.client.post(self.approve_url(profile))

        response = self.client.post(self.approve_url(profile))

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["status"], 409)

    def test_aprobar_relee_el_estado_de_la_bd_bajo_candado(self):
        """Carrera clásica: otro admin ya decidió pero el objeto que se
        tiene en memoria sigue viendo PENDING. El check corre DENTRO de
        transaction.atomic + select_for_update → 409 y nada cambia."""
        profile = self.make_profile()
        SupplierProfile.objects.filter(pk=profile.pk).update(
            status=SupplierProfileStatus.APPROVED
        )
        self.assertEqual(profile.status, SupplierProfileStatus.PENDING)

        with self.assertRaises(SupplierAlreadyReviewedException):
            supplier_service.approve(profile, admin=self.admin)

        profile.refresh_from_db()
        self.assertEqual(profile.status, SupplierProfileStatus.APPROVED)

    def test_rechazar_relee_el_estado_de_la_bd_bajo_candado(self):
        """Mismo candado en reject: si ya estaba decidido, no se repite."""
        profile = self.make_profile()
        SupplierProfile.objects.filter(pk=profile.pk).update(
            status=SupplierProfileStatus.REJECTED,
            rejection_reason="ya rechazado",
        )

        with self.assertRaises(SupplierAlreadyReviewedException):
            supplier_service.reject(
                profile, reason="otro motivo", admin=self.admin
            )

        profile.refresh_from_db()
        self.assertEqual(profile.rejection_reason, "ya rechazado")

    def test_rechazar_guarda_el_motivo_y_publica_supplier_rejected(self):
        profile = self.make_profile()
        self.auth_as(self.admin)

        with patch("accounts.events.publisher.publish") as mock_publish:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    self.reject_url(profile),
                    {"reason": "Datos incompletos"},
                    format="json",
                )

        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["status"], "REJECTED")
        self.assertEqual(data["rejection_reason"], "Datos incompletos")
        mock_publish.assert_called_once()
        kwargs = mock_publish.call_args.kwargs
        self.assertEqual(kwargs["event_name"], "SUPPLIER_REJECTED")
        self.assertEqual(
            kwargs["payload"],
            {"supplier_id": profile.user_id, "reason": "Datos incompletos"},
        )

    def test_rechazar_sin_motivo_devuelve_400(self):
        profile = self.make_profile()
        self.auth_as(self.admin)

        response = self.client.post(self.reject_url(profile), {}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_perfil_inexistente_devuelve_404(self):
        self.auth_as(self.admin)

        response = self.client.post(f"{ADMIN_SUPPLIERS_URL}/9999/approve")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["status"], 404)

    def test_proveedor_no_puede_aprobar(self):
        profile = self.make_profile()
        self.auth_as(self.proveedor)

        response = self.client.post(self.approve_url(profile))

        self.assertEqual(response.status_code, 403)

    def test_si_el_bus_falla_la_aprobacion_no_falla(self):
        """docs/eventos.md regla 3: el bus caído no invalida el cambio."""
        profile = self.make_profile()
        self.auth_as(self.admin)

        with patch(
            "accounts.events.publisher.publish",
            side_effect=RuntimeError("bus caido"),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(self.approve_url(profile))

        self.assertEqual(response.status_code, 200)
        profile.refresh_from_db()
        self.assertEqual(profile.status, SupplierProfileStatus.APPROVED)

    def test_aprobar_sin_token_devuelve_401(self):
        profile = self.make_profile()

        response = self.client.post(self.approve_url(profile))

        self.assertEqual(response.status_code, 401)
