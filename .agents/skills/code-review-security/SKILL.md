---
name: code-review-security
description: Revisar código en busca de errores comunes, fallos de seguridad, violaciones de convenciones, y problemas que rompan los contratos entre microservicios. Usar antes de abrir un Pull Request o al revisar el PR de otro integrante.
---

# Revisión de código y seguridad

> Usar **antes** de abrir un PR y **al revisar** el PR de otro integrante.
> Un problema de seguridad detectado en revisión cuesta minutos; en
> producción, cuesta la confianza del equipo.

## Checklist de seguridad

### Credenciales y secretos

- [ ] **Ningún** `.env` real commiteado. Verificar con `git log --all --diff-filter=A --name-only | grep -i "\.env$"`.
- [ ] Ninguna contraseña, `JWT_SECRET` o `SECRET_KEY` hardcodeada en el código.
- [ ] `.env.example` actualizado si se agregó una variable nueva.
- [ ] Ninguna URL con credenciales embebidas (`postgres://user:pass@...`).
- [ ] Sin claves de API de servicios externos (SMTP, Cloudinary).

### Autenticación y autorización

- [ ] **Cada microservicio valida el JWT por su cuenta**, además del Gateway.
      Si solo el Gateway valida, alguien que llegue directo por la red Docker
      se cuela.
- [ ] No se confía ciegamente en `X-User-Id` sin verificar el token.
- [ ] Las operaciones de escritura exigen el rol correcto **en el backend**.
- [ ] Un usuario no puede operar sobre recursos de otro. Verificar el
      `owner_id` antes de permitir `PATCH` o `DELETE`.
- [ ] `verify` de Identity **realmente decodifica** el token. (El código
      anterior en PHP devolvía `{"valid": true}` sin verificar nada: no
      repetir ese error.)
- [ ] Los tokens expiran. Sin expiración indefinida.
- [ ] Las contraseñas se comparan con `password_hash` / `check_password`,
      nunca con `==` ni en texto plano.

### Inyección y validación

- [ ] Todas las entradas validadas con DTO/schemas (Joi, Zod, DRF Serializer).
- [ ] Sin concatenar strings en consultas SQL. Parámetros siempre.
- [ ] `sequelize.query()` con ` replacements ` o ` bind ` si se usa crudo.
- [ ] Archivos subidos: validar **tipo y tamaño**. `multer` con `fileFilter`
      y `limits`. No confiar en la extensión declarada.
- [ ] Sin `eval()`, `new Function()`, ni `child_process.exec` con entrada del
      usuario.
- [ ] Sin `innerHTML` con datos del usuario en Angular (`[innerHTML]` solo
      con sanitización).

### Exposición de datos

- [ ] Ningún `500` devuelve el stack trace al cliente.
- [ ] No se devuelven campos de más. Un serializer de login **nunca** incluye
      `password_hash`.
- [ ] El `SELECT *` no expone columnas sensibles que no se necesitan.

### CORS

- [ ] `Access-Control-Allow-Origin: *` **no** está en producción. Solo en
      desarrollo, y apuntando al frontend (`localhost:4200`).
- [ ] Los headers permitidos incluyen `Authorization` y los `X-User-*`.

## Checklist del monorepo

- [ ] **Ningún servicio consulta la base de otro.** Buscar conexiones a BD
      ajenas.
- [ ] **Ninguna importación entre microservicios.** Buscar `require('../..`)
      que cruce límites de servicio.
- [ ] `packages/shared/` contiene **solo tipos y contratos**, no lógica de
      negocio.
- [ ] Todo endpoint nuevo está documentado en `docs/contratos-api.md`.
- [ ] Todo evento nuevo está documentado en `docs/eventos.md`.
- [ ] Todo puerto nuevo está en `docs/puertos.md` y en `.env.example`.
- [ ] Ningún servicio expone su puerto directamente al navegador; todo pasa
      por el Gateway (`4000`).

## Checklist de arquitectura

- [ ] `domain/` no tiene ningún `require` de Express, Sequelize o RabbitMQ.
- [ ] Los repositorios en `domain/` son interfaces; la implementación está en
      `infrastructure/persistence/`.
- [ ] Los controllers son delgados. Sin `if` de reglas de negocio.
- [ ] La lógica de negocio no se duplicó entre dos servicios.
- [ ] No se agregó una dependencia sin justificación en el PR.

## La regla crítica

Antes de aprobar cualquier PR que toque `offer-service`, confirmar que la
regla de una sola oferta aceptada sigue intacta:

- [ ] El índice `UNIQUE` parcial existe y no se migró.
- [ ] El handler usa transacción y `SELECT ... FOR UPDATE`.
- [ ] La entidad lanza `OfferAlreadyAcceptedException`.
- [ ] La prueba correspondiente sigue pasando.

Si un PR "simplifica" esa validación, **no aprobar**. Es la regla más
importante del proyecto.

## Patrones sospechosos

| Señal | Por qué preocupa |
|---|---|
| `if (user.role === 'ADMIN')` solo en el frontend | Cualquiera puede llamar al endpoint directo |
| `WHERE id = ${id}` con template string | Inyección SQL |
| `catch (e) { res.status(500).json({ error: e.message }) }` | Expone el stack |
| `JWT.verify` sin verificar `exp` | Tokens que nunca expiran |
| `WHERE email = ?` sin validar existencia antes de `UPDATE` | Actualización silenciosa |
| Dos servicios con la misma conexión a BD | Rompe la persistencia independiente |
| Un evento publicado antes del `commit` | Si la BD falla, se emitió algo que no pasó |
| `try/catch` vacío | Errores tragados, imposible de depurar |
| Comentario `TODO` sin issue asociado | Deuda invisible |

## Al revisar el PR de otro integrante

1. **Leer `docs/`** antes de opinar. Las convenciones están escritas; no son
   opiniones personales.
2. **Ejecutar las pruebas** localmente. No aprobar con CI roto.
3. **Probar el caso borde** que el autor no mencionó.
4. **Preguntar, no imponer.** "¿Qué pasa si dos requests llegan a la vez?"
   enseña más que "esto está mal".
5. **Separar lo bloqueante de lo opcional.** Lo bloqueante se corrige antes
   de mergear; lo opcional puede quedar como issue.
6. **Agradecer.** Revisar código ajeno es trabajo. El equipo funciona si la
   revisión no se siente como un ataque.

## Al terminar

- Nada de la checklist de seguridad quedó sin revisar.
- Las observaciones se reportaron en el PR, no en un chat paralelo.
- Si se rechazó algo, se explicó por qué y qué se espera.
