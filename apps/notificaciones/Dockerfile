# Usar versión oficial ligera de Node.js
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4005

CMD ["npm", "start"]
