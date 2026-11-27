/**
 * Configuración de entorno.
 *
 * El navegador habla SIEMPRE con el Gateway, nunca con un microservicio
 * (AGENTS.md §4.4). El valor es el mismo que documentan docs/frontend.md y
 * .env.example (FRONTEND_ORIGIN / API_BASE_URL): el usuario abre
 * http://localhost:4200 y el pedido sale hacia http://localhost:4000.
 */
export const environment = {
  apiUrl: 'http://localhost:4000/api/v1',
};
