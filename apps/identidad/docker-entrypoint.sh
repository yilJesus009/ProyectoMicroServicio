#!/bin/sh
# =============================================================================
# Arranque de Identidad (Django) dentro de Docker
# =============================================================================
#   1. migrate      -> crea las tablas en el esquema `identidad`
#   2. create_admin -> crea ADMIN_EMAIL / ADMIN_PASSWORD si no existe
#   3. runserver    -> levanta el servicio
#
# El puerto es 5000 porque así lo espera el Gateway dentro de la red de
# compose (IDENTIDAD_SERVICE_URL=http://identidad:5000). NO es configurable
# desde fuera: cambiarlo rompería el enrutado.
# =============================================================================
set -e

echo "[identidad] Aplicando migraciones..."
python manage.py migrate --noinput

echo "[identidad] Verificando administrador inicial..."
python manage.py create_admin

echo "[identidad] Levantando el servidor en el puerto 5000..."
exec python manage.py runserver "0.0.0.0:5000"
