require('dotenv').config();
require('dotenv').config({
  path: require('node:path').resolve(__dirname, '../../../.env'),
});

const { createApp } = require('./app');

const port = Number(process.env.API_GATEWAY_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('API_GATEWAY_PORT debe ser un puerto válido');
}

const app = createApp();
app.listen(port, () => {
  console.log(`API Gateway escuchando en el puerto ${port}`);
});