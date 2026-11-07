# Identidad (Django + DRF)
FROM python:3.11-slim

WORKDIR /usr/src/app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Arranque: migrate -> create_admin -> runserver (ver docker-entrypoint.sh).
# Se usa `sh` explícitamente para no depender del bit de ejecución del
# archivo al clonar en Windows.
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["sh", "docker-entrypoint.sh"]

EXPOSE 5000
