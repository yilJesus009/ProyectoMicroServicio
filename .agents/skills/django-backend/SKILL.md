---
name: django-backend
description: Implementar y mantener Identidad en Django con DRF y SimpleJWT. Registro, login, JWT, roles COMPRADOR/PROVEEDOR/ADMIN, perfil comercial del proveedor y su aprobación, publicación de eventos a RabbitMQ. Usar cuando se trabaja en apps/identidad.
---

# Django Backend — Identidad

> Único microservicio en Django (requisito del docente). Los demás son
> Express, NestJS o Spring Boot.

## Antes de empezar

1. Leer `AGENTS.md` y `docs/modelo-datos.md` (esquema `identidad`).
2. Leer `docs/contratos-api.md`, sección Identidad.
3. Leer `docs/eventos.md`: `USER_CREATED`, `SUPPLIER_PROFILE_SUBMITTED`,
   `SUPPLIER_APPROVED`, `SUPPLIER_REJECTED`.

## Responsabilidad

Define **quién es cada usuario** y emite el JWT que el Gateway descompone
en headers. Además: perfil comercial del proveedor y su aprobación por el
admin.

- Registro y login. Roles `COMPRADOR`, `PROVEEDOR`, `ADMIN`.
- `SupplierProfile`: datos del proveedor, estado (`PENDING`, `APPROVED`,
  `REJECTED`), ciudad y categorías.
- Django Admin como panel de administración.

## Esquema propio en el Postgres compartido

No hay una base por servicio: un PostgreSQL (`repuestosya`) con esquema
`identidad`. En `settings.py`:

```python
DATABASES = {"default": {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": env("DB_NAME"), "USER": env("DB_IDENTIDAD_USER"),
    "PASSWORD": env("DB_IDENTIDAD_PASSWORD"), "HOST": env("DB_HOST"), "PORT": env("DB_PORT"),
    "OPTIONS": {"options": "-c search_path=identidad"},
}}
```

## El modelo de usuario

Email como identificador de login, no username:

```python
class Role(models.TextChoices):
    COMPRADOR = "COMPRADOR", "Comprador"
    PROVEEDOR = "PROVEEDOR", "Proveedor"
    ADMIN     = "ADMIN",     "Administrador"

class User(AbstractBaseUser, PermissionsMixin):
    nombre = models.CharField(max_length=120)
    email  = models.EmailField(unique=True)   # 409 del contrato ya viene de aquí
    rol    = models.CharField(max_length=20, choices=Role.choices)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nombre", "rol"]

class SupplierProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    business_name = models.CharField(max_length=160)
    city = models.CharField(max_length=80)
    status = models.CharField(max_length=20, default="PENDING")  # PENDING|APPROVED|REJECTED
    category_ids = models.JSONField(default=list)
```

## Envelope de respuesta

Centralizado en `core/responses.py`: `success(data, msg, status)` y
`error(msg, status, data)`. Nunca el envelope de DRF por defecto.

## JWT

`djangorestframework-simplejwt`. El claim `rol` es el que el Gateway lee;
**la aprobación del proveedor no va en el token** (decisión D11: Negociación
la conoce por su copia local de `SUPPLIER_APPROVED`/`SUPPLIER_REJECTED`).

```python
refresh = RefreshToken.for_user(user)
refresh["rol"] = user.rol
```

Exponer `POST /api/v1/auth/verify` para que el Gateway valide sin repetir
la lógica de decodificación.

## Publicar eventos (transaction.on_commit)

```python
def publish_supplier_approved(profile):
    transaction.on_commit(lambda: publish(
        "identity_events", "SUPPLIER_APPROVED",
        {"supplier_id": profile.user_id, "business_name": profile.business_name,
         "city": profile.city, "category_ids": profile.category_ids},
        correlation_id, producer="identidad",
    ))
```

El sobre lleva `event_id` (uuid4), `event_name`, `version: 1`,
`occurred_at`, `correlation_id`, `producer`, `payload` (`docs/eventos.md`).
**Publicar solo tras confirmar la transacción**, y envolver en
`try/except` con reintento simple: un fallo de RabbitMQ no bloquea el
registro ni la aprobación.

## Errores de dominio

`EmailAlreadyRegisteredException`, `SupplierProfileNotFoundException`, etc.
en `accounts/exceptions.py`; se traducen a HTTP en un handler global, no en
la vista.

## Migraciones y Admin

- `makemigrations` + `migrate` antes de avisar. Nunca editar una migración
  aplicada: crear una nueva. Commitearlas.
- Registrar `User` y `SupplierProfile` en Django Admin
  (`list_filter` por `rol`/`status`, `search_fields` por `email`).

## Reglas duras

1. Nunca contraseñas en claro: `set_password()` / `check_password()`.
2. Nunca exponer la contraseña en serializer o Admin.
3. Nunca hardcodear `SECRET_KEY`, `JWT_SECRET` ni credenciales de BD.
4. El rol y la aprobación se validan en el backend, no en el frontend.
5. Este servicio no consulta la base de ningún otro.

## Al terminar

`python manage.py check` y `test` pasando; migraciones commiteadas;
`USER_CREATED`/`SUPPLIER_APPROVED` visibles en la UI de RabbitMQ. Resumir
archivos modificados, pruebas realizadas, limitaciones.
