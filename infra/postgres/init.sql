-- =============================================================================
-- RepuestosYa - infra/postgres/init.sql
-- =============================================================================
-- Se ejecuta UNA SOLA VEZ, cuando el contenedor `postgres` arranca con un
-- volumen nuevo (docker compose down -v && docker compose up).
--
-- Que crea:
--   1. Los 5 esquemas: uno por microservicio.
--   2. Los 5 usuarios: cada uno DUEÑO de su esquema.
--   3. Los permisos: cada usuario solo ve y usa SU esquema.
--
-- Por que un esquema por servicio (AGENTS.md seccion 5, decisiones.md D3):
--   todos los servicios comparten un solo PostgreSQL, pero NINGUNO puede leer,
--   escribir ni hacer JOIN sobre los datos de otro. Si necesita un dato ajeno,
--   lo pide por API o lo recibe en un evento.
--
-- CONTRASENAS: psql no puede leer variables de entorno dentro de este
-- archivo, por lo que van aqui en claro y DEBEN coincidir con .env.example
-- (DB_IDENTIDAD_PASSWORD, DB_NEGOCIACION_PASSWORD, ...). Si cambias una,
-- cambia las dos. Son credenciales de desarrollo, no secretos reales.
-- =============================================================================

-- Detener en el primer error: si algo falla, el contenedor no debe quedar a
-- medias creyendo que la base quedo bien.
\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- 1) Esquemas (uno por microservicio)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS identidad;
CREATE SCHEMA IF NOT EXISTS negociacion;
CREATE SCHEMA IF NOT EXISTS pedidos;
CREATE SCHEMA IF NOT EXISTS catalogo;
CREATE SCHEMA IF NOT EXISTS notificaciones;

-- ---------------------------------------------------------------------------
-- 2) Un usuario de base por servicio
-- ---------------------------------------------------------------------------
CREATE ROLE identidad_user      LOGIN PASSWORD 'identidad_pass';
CREATE ROLE negociacion_user    LOGIN PASSWORD 'negociacion_pass';
CREATE ROLE pedidos_user        LOGIN PASSWORD 'pedidos_pass';
CREATE ROLE catalogo_user       LOGIN PASSWORD 'catalogo_pass';
CREATE ROLE notificaciones_user LOGIN PASSWORD 'notificaciones_pass';

-- ---------------------------------------------------------------------------
-- 3) Cada usuario es DUEÑO de su esquema
-- ---------------------------------------------------------------------------
-- El dueno puede crear, leer, escribir y borrar dentro de su esquema, y nada
-- mas hace falta concederle.
ALTER SCHEMA identidad       OWNER TO identidad_user;
ALTER SCHEMA negociacion     OWNER TO negociacion_user;
ALTER SCHEMA pedidos         OWNER TO pedidos_user;
ALTER SCHEMA catalogo        OWNER TO catalogo_user;
ALTER SCHEMA notificaciones OWNER TO notificaciones_user;

-- ---------------------------------------------------------------------------
-- 4) Aislamiento: nadie toca el esquema de otro
-- ---------------------------------------------------------------------------
-- Se quita el acceso por defecto que PostgreSQL otorga a PUBLIC sobre todos
-- los esquemas. Sin esto, identidad_user tendria acceso a negociacion.
REVOKE ALL ON SCHEMA identidad, negociacion, pedidos, catalogo, notificaciones
    FROM PUBLIC;

-- El esquema `public` queda tambien cerrado: cada servicio trabaja solo en el
-- suyo. El usuario administrador (postgres) es superusuario y no se ve afectado.
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- El dueno ya tiene todos los privilegios por ser dueno; el GRANT es explicito
-- para que se pueda leer y verificar en la defensa.
GRANT USAGE ON SCHEMA identidad       TO identidad_user;
GRANT USAGE ON SCHEMA negociacion     TO negociacion_user;
GRANT USAGE ON SCHEMA pedidos         TO pedidos_user;
GRANT USAGE ON SCHEMA catalogo        TO catalogo_user;
GRANT USAGE ON SCHEMA notificaciones TO notificaciones_user;

-- ---------------------------------------------------------------------------
-- 5) search_path por usuario (defensa en profundidad)
-- ---------------------------------------------------------------------------
-- Aunque cada framework configure su propio search_path, aqui se fija a
-- nivel de base: cualquier conexion como identidad_user busca primero en
-- `identidad`, aunque el framework lo olvide. Las tablas creadas sin esquema
-- explicito aterrizan en el esquema propio.
ALTER ROLE identidad_user      SET search_path = identidad;
ALTER ROLE negociacion_user    SET search_path = negociacion;
ALTER ROLE pedidos_user        SET search_path = pedidos;
ALTER ROLE catalogo_user       SET search_path = catalogo;
ALTER ROLE notificaciones_user SET search_path = notificaciones;
