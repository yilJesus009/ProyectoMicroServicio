---
name: django-backend
description: Implementar y mantener el Identity Service en Django con DRF y SimpleJWT. Registro, login, JWT, roles COMPRADOR/PROVEEDOR/ADMIN, y publicación de eventos a RabbitMQ. Usar cuando se trabaja en apps/identity-service.
---

# Django Backend — Identity Service

> Este es el **único** microservicio en Django. Es obligatorio por requisito
> del docente. Los demás servicios son Express.

## Antes de empezar

1. Leer `AGENTS.md`.
2. Leer `docs/contratos-api.md`, sección Identity Service.
3. Leer `docs/eventos.md`, sección `identity_events`.
4. Revisar la estructura existente de `apps/identity-service/`.

## Responsabilidad

Identity Service define **quién es cada usuario**. Es el servicio del que
dependen todos los demás, porque define el JWT que el Gateway descompone en
headers.

- Registro y autenticación de usuarios.
- Roles: `COMPRADOR`, `PROVEEDOR`, `ADMIN`.
- Emisión y verificación de JWT.
- Publicación de `USER_CREATED`, `USER_ROLE_CHANGED`.
- Django Admin como panel de administración.

## Estructura

```
apps/identity-service/
├── manage.py
├── requirements.txt
├── Dockerfile
├── identity_service/        # proyecto Django (settings, urls, wsgi)
├── accounts/                # app principal
│   ├── models.py            # User, Role
│   ├── serializers.py       # RegisterSerializer, LoginSerializer, UserSerializer
│   ├── views.py             # RegisterView, LoginView, MeView, VerifyView
│   ├── urls.py
│   ├── services/            # lógica de negocio
│   │   ├── auth_service.py
│   │   └── user_service.py
│   ├── events/              # productor RabbitMQ
│   │   ├── publisher.py
│   │   └── event_names.py
│   ├── exceptions.py        # EmailAlreadyRegisteredException, InvalidRoleException
│   └── admin.py             # registro en Django Admin
└── core/                    # capa compartida interna
    ├── middleware.py        # extrae X-User-Id si viene del Gateway
    ├── responses.py         # envelope {status, msg, data}
    └── messaging.py         # conexión a RabbitMQ
```

La idea de las capas de `clean-architecture-ddd` aplica igual, con nombres
de Django: `models.py` (dominio), `services/` (casos de uso), `views.py`
(presentación, delgadas), `events/` (infraestructura).

## El modelo de usuario

No usar `AbstractUser` directamente si no necesitas usernames. Usar email
como identificador de login:

```python
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

class Role(models.TextChoices):
    COMPRADOR = "COMPRADOR", "Comprador"
    PROVEEDOR = "PROVEEDOR", "Proveedor"
    ADMIN     = "ADMIN",     "Administrador"

class User(AbstractBaseUser, PermissionsMixin):
    nombre     = models.CharField(max_length=120)
    email      = models.EmailField(unique=True)
    telefono   = models.CharField(max_length=20, blank=True, null=True)
    ciudad     = models.CharField(max_length=80, blank=True, null=True)
    rol        = models.CharField(max_length=20, choices=Role.choices)
    activo     = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["nombre", "rol"]
```

**`email` único** garantiza el `409` del contrato de la API.

## El envelope de respuesta

Todo responde `{status, msg, data}`. Centralizarlo en `core/responses.py`:

```python
from rest_framework.response import Response

def success(data=None, msg="Operación exitosa", status=200):
    return Response({"status": status, "msg": msg, "data": data}, status=status)

def error(msg, status=400, data=None):
    return Response({"status": status, "msg": msg, "data": data}, status=status)
```

Nunca devolver el envelope de DRF por defecto. El equipo ya lo acordó en
`docs/convenciones.md`.

## JWT

Usar `djangorestframework-simplejwt`. El token debe llevar el rol, porque el
Gateway lo descompone en `X-User-Roles`.

```python
from rest_framework_simplejwt.tokens import RefreshToken

def build_token(user):
    refresh = RefreshToken.for_user(user)
    refresh["rol"]  = user.rol          # claim personalizado
    refresh["name"] = user.nombre
    return {
        "token":        str(refresh.access_token),
        "expires_in":   int(refresh.access_token.lifetime.total_seconds()),
        "usuario":      to_user_dto(user),
    }
```

**Importante:** el claim `rol` es el que el Gateway lee. Si cambia, se publica
`USER_ROLE_CHANGED`.

## Verificación de tokens

Exponer `POST /api/v1/auth/verify` para que el Gateway valide un token sin
repetir la lógica:

```python
class VerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token") or ""
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=["HS256"]
            )
            return success({
                "valid":   True,
                "user_id": payload.get("user_id"),
                "rol":     payload.get("rol"),
                "email":   payload.get("email"),
            })
        except jwt.ExpiredSignatureError:
            return error("Token expirado", status=401, data={"valid": False})
        except jwt.InvalidTokenError:
            return error("Token inválido", status=401, data={"valid": False})
```

> ⚠️ **Lección de un error en el código anterior:** la versión en PHP devolvía
> `{"valid": true}` sin verificar nada, y generaba un token aleatorio que no
> era un JWT. Ambos errores están corregidos aquí: el token se firma con
> `SimpleJWT` y `verify` realmente decodifica y valida.

## Publicar eventos

`core/messaging.py` mantiene la conexión; `accounts/events/publisher.py`
publica.

```python
import json, pika

def publish(topic: str, event_name: str, payload: dict, correlation_id: str):
    params = pika.ConnectionParameters(
        host=settings.RABBITMQ_HOST,
        port=settings.RABBITMQ_PORT,
        credentials=pika.PlainCredentials(settings.RABBITMQ_USER, settings.RABBITMQ_PASS),
    )
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.exchange_declare(exchange=topic, exchange_type="topic", durable=True)

    message = {
        "event_name":    event_name,
        "occurred_at":   datetime.now(timezone.utc).isoformat(),
        "correlation_id": correlation_id,
        "producer":      "identity-service",
        "payload":       payload,
    }
    channel.basic_publish(
        exchange=topic,
        routing_key=event_name,
        body=json.dumps(message, ensure_ascii=False),
        properties=pika.BasicProperties(delivery_mode=2),  # persistente
    )
    connection.close()
```

**Publicar después de persistir, nunca antes.** Si la BD falla, no se emite
un evento de algo que no pasó.

**El publish no debe romper el registro.** Envolverlo en `try/except` y
loguear: un fallo de mensajería no puede impedir que un usuario se registre.

## Errores de dominio

```python
class EmailAlreadyRegisteredException(Exception):
    def __init__(self, email):
        super().__init__(f"El correo {email} ya se encuentra registrado")

class InvalidRoleException(Exception):
    def __init__(self, rol):
        super().__init__(f"Rol no válido: {rol}. Use COMPRADOR, PROVEEDOR o ADMIN")
```

Se traducen a HTTP en un handler global, no en la vista.

## Migraciones

- Correr `python manage.py makemigrations` y `migrate` antes de avisar.
- **Nunca** editar una migración ya aplicada. Crear una nueva.
- Commitear los archivos de migración: son parte del código.

## Django Admin

Registrar los modelos para tener un panel gratuito de administración:

```python
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ("email", "nombre", "rol", "activo", "created_at")
    list_filter   = ("rol", "activo", "ciudad")
    search_fields = ("email", "nombre")
```

Es un diferencial del proyecto: administración sin frontend.

## Reglas duras que aplican aquí

1. **Nunca** guardar contraseñas en claro. `set_password()` / `check_password()`.
2. **Nunca** exponer la contraseña en un serializer ni en el Admin.
3. **Nunca** hardcodear `SECRET_KEY`, `JWT_SECRET` ni credenciales de BD.
4. El rol se valida en el backend, no en el frontend.
5. Este servicio **no** consulta la base de ningún otro servicio.

## Al terminar

- `python manage.py check` sin errores.
- `python manage.py test` pasando.
- Las migraciones están commiteadas.
- `USER_CREATED` se publica en el registro y se puede ver en la UI de RabbitMQ.
- Resumir: archivos modificados, pruebas realizadas, limitaciones.
