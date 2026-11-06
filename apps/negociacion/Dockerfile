# Usar versión oficial ligera de Node.js
FROM node:20-alpine

# Crear y definir el directorio de trabajo
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias del proyecto
RUN npm install

# Copiar el resto del código fuente del microservicio
COPY . .

# Exponer el puerto donde corre Express (4001)
EXPOSE 4001

# Comando para arrancar el servicio
CMD ["npm", "start"]