require('dotenv').config();
require('dotenv').config({
  path: require('node:path').resolve(__dirname, '../../../.env'),
});

const { createApp } = require('./app');

// GATEWAY_PORT viene de .env.example. Dentro de Docker lo inyecta
// docker-compose.yml; fuera de Docker se lee del .env de la raiz.
const port = Number(process.env.GATEWAY_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('GATEWAY_PORT debe ser un puerto válido');
}

const app = createApp();
app.listen(port, () => {
  console.log(`API Gateway escuchando en el puerto ${port}`);
});
