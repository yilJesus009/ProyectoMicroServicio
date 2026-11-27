# =============================================================================
# Frontend (Angular) — build con Node, servido por nginx en el puerto 4200
# =============================================================================
# Etapa 1: compilar. Node 20 es el MISMO que usa el job "Frontend (Angular)"
# de CI (.github/workflows/ci.yml), así que el build de Docker y el de
# GitHub corren sobre la misma versión.
# =============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Primero solo el manifiesto: mientras no cambien las dependencias, la capa
# de npm ci se reutiliza de caché y el build arranca más rápido.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# El mismo comando que corre el CI: si falla acá, falla allá.
RUN npx ng build --configuration production

# =============================================================================
# Etapa 2: nginx sirve los archivos estáticos. Sin Node, sin node_modules.
# =============================================================================
FROM nginx:1.27-alpine AS runtime

# SPA: cualquier ruta que no sea un archivo cae en index.html (ver nginx.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# @angular/build:application deja el navegador en dist/<proyecto>/browser
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# El puerto de nginx es fijo dentro del contenedor; docker-compose lo mapea
# con FRONTEND_PORT. Ver .env.example.
EXPOSE 4200

# nginx corre en primer plano y responde a las señales del contenedor.
CMD ["nginx", "-g", "daemon off;"]
