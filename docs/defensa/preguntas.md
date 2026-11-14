# Preguntas probables de la defensa

Respuestas cortas, con el archivo donde se ve cada cosa. **Ambos** significa
que los dos tienen que poder responderla aunque la pregunta caiga del lado
del otro bloque.

---

### 1. ¿Por qué 5 servicios, y no más o menos?

**Responsable: Ambos**

Identidad, Negociación (solicitudes + ofertas juntas), Pedidos, Catálogo y
Notificaciones. Solicitudes y Ofertas se unieron en uno solo porque la
regla principal ("una sola oferta aceptada") involucra a las dos a la vez:
aceptar, rechazar las demás y cerrar la solicitud es una sola transacción.
Separarlas habría obligado a coordinarlas por eventos, con riesgo de datos
atrasados.

**Archivo:** `docs/decisiones.md` → D1.

---

### 2. ¿Por qué un esquema por servicio en una sola base, en vez de una base por servicio?

**Responsable: Ambos**

Una sola base cumple la consigna y es más simple de operar; un esquema por
servicio, con su propio usuario de Postgres dueño solo de ese esquema,
mantiene el aislamiento real — si un servicio intenta tocar el esquema de
otro, Postgres responde `permission denied`, no el código.

**Archivo:** `docs/decisiones.md` → D3; `infra/postgres/init.sql` (crea los 5
esquemas y 5 usuarios `LOGIN`, cada uno dueño solo del suyo).

---

### 3. ¿Qué es el outbox y por qué lo necesitan?

**Responsable: Ambos**

Guardar el cambio de negocio y el evento que hay que avisar **en la misma
transacción** de Postgres, en vez de publicar directo a RabbitMQ al mismo
tiempo. Si el proceso se cae entre guardar y publicar, el evento no se
pierde: queda en la tabla con `published_at` vacío y un proceso aparte lo
reintenta hasta lograrlo.

**Archivo:** `docs/eventos.md`; `apps/negociacion/.../outboxPublisherWorker.js`;
`apps/pedidos/.../OutboxPublisherScheduler.java`.

---

### 4. ¿Cómo se garantiza que una sola oferta se acepte por solicitud?

**Responsable: Dylan**

Tres capas: (1) la solicitud se bloquea con `SELECT ... FOR UPDATE` antes
de aceptar, retirar u ofertar — las tres operaciones se serializan entre
sí; (2) dentro de esa transacción, si ya hay una oferta `ACCEPTED` se lanza
`OfferAlreadyAcceptedException` → `409`, antes de cualquier chequeo de
estado; (3) un índice `UNIQUE` parcial en la base
(`uq_one_accepted_offer ON offers (part_request_id) WHERE status = 'ACCEPTED'`)
como última red, si algo se colara igual.

**Archivo:** `apps/negociacion/src/infrastructure/persistence/offer.model.js`
(el índice); `.../partRequestRepository.js` (el `FOR UPDATE`);
`apps/negociacion/src/domain/errors/index.js` (la excepción → 409).

---

### 5. ¿Qué pasa si dos personas aceptan la misma solicitud exactamente a la vez?

**Responsable: Dylan**

Se puede probar de verdad, no solo explicarlo: un script lanza los dos
`POST /offers/{id}/accept` con `Promise.all`, contra Postgres real. Siempre
da un `200`, un `409` y una sola oferta `ACCEPTED`.

**Archivo:** `scripts/prueba-concurrencia-aceptar.mjs`.

---

### 6. ¿Qué pasa si RabbitMQ se cae un momento?

**Responsable: Dylan**

Nada se pierde. El evento ya está guardado en `outbox_events` desde que se
hizo el cambio de negocio (misma transacción); el proceso que publica
reintenta cada 1–2 segundos hasta que el broker vuelve, y recién ahí marca
`published_at`.

**Archivo:** `apps/negociacion/.../outboxPublisherWorker.js`;
`apps/pedidos/.../OutboxPublisherScheduler.java` (ambos con confirmación
del broker antes de marcar publicado).

---

### 7. ¿Cómo evitan procesar el mismo evento dos veces?

**Responsable: Dylan**

Cada consumidor guarda el `event_id` que ya procesó en `processed_events`,
en la misma transacción que el efecto del evento. Si RabbitMQ entrega el
mismo mensaje otra vez, se detecta antes de aplicar nada. Hay un segundo
nivel más fino en Pedidos: si el mismo `OFFER_ACCEPTED` llega con un
`event_id` **distinto** pero el mismo `offer_id`, un índice único en
`orders.offer_id` lo detecta igual y no crea un segundo pedido.

**Archivo:** `apps/negociacion/.../applyOrderStatusChanged.js`;
`apps/pedidos/.../CreateOrderFromOfferAccepted.java`.

---

### 8. ¿Qué pasa con un evento sin `event_id` o con un JSON mal formado?

**Responsable: Dylan**

Se rechaza **antes** de tocar cualquier lógica de negocio: el consumidor
hace `nack` sin reencolar, y RabbitMQ lo manda a la cola de errores de ese
servicio (`<cola>.dlq`, por el exchange compartido `dlx`).

**Archivo:** `apps/negociacion/.../supplierEventsConsumer.js` (función
`handleRawMessage`, el mismo patrón se repite en los demás consumidores).

---

### 9. ¿Qué patrón de diseño hay en cada parte de Pedidos?

**Responsable: Dylan**

**State** (`OrderStatus`: cada estado sabe a cuáles puede pasar), **Strategy**
(`DeliveryType` decide el siguiente estado después de `PREPARING` según
entrega o retiro; `PaymentMethod` genera su propia referencia para QR o
tarjeta), **Factory** (`OrderFactory` arma el pedido solo desde el evento
`OFFER_ACCEPTED`) y **Adapter** (`SimulatedPaymentGateway`: si mañana hay
una pasarela real, se cambia esa sola pieza).

**Archivo:** `apps/pedidos/.../domain/enums/OrderStatus.java`,
`DeliveryType.java`, `PaymentMethod.java`; `domain/entities/OrderFactory.java`;
`infrastructure/payments/SimulatedPaymentGateway.java`.

---

### 10. ¿Cómo aplican CQRS?

**Responsable: Dylan**

`application/` se divide en `commands/` (escritura: una clase por
operación, con su propia transacción) y `queries/` (lectura, sin efectos
secundarios). Ninguna clase hace las dos cosas.

**Archivo:** `apps/negociacion/src/application/{commands,queries}/`;
`apps/pedidos/.../application/{commands,queries}/`;
`apps/catalogo/src/application/{commands,queries}/`.

---

### 11. ¿Cómo se garantiza que nunca se guardan datos de tarjeta?

**Responsable: Dylan**

El body del pago solo acepta `{ "method": "QR" | "CARD" }`: el DTO usa
`@JsonAnySetter` para **rechazar** (400) cualquier campo que no sea
`method`, antes de que llegue a la lógica de negocio. La tabla `payments`
ni siquiera tiene columnas para número de tarjeta, vencimiento o CVV.

**Archivo:** `apps/pedidos/.../presentation/http/dto/PaymentRequest.java`.

---

### 12. ¿Por qué el pedido solo nace del evento `OFFER_ACCEPTED` y no hay un endpoint para crearlo?

**Responsable: Dylan**

Es una de las reglas que no se negocian del proyecto: si existiera un
`POST /orders` directo, alguien podría crear un pedido sin que exista una
oferta aceptada real detrás. El único camino es el consumidor de
`OFFER_ACCEPTED`.

**Archivo:** `AGENTS.md` regla 3; `apps/pedidos/.../OfferAcceptedListener.java`.

---

### 13. ¿Por qué Django para Identidad?

**Responsable: Jesús**

Lo exige la consigna para el servicio de usuarios, y trae de fábrica
autenticación, contraseñas con hash y un panel de administración — todo
lo que Identidad necesita sin construirlo desde cero.

**Archivo:** `docs/decisiones.md` → D2.

---

### 14. ¿Por qué Spring Boot para Pedidos y NestJS para Catálogo?

**Responsable: Dylan**

Spring Boot para Pedidos porque su mensajería con RabbitMQ y su manejo de
transacciones son muy maduros, y Pedidos vive de eventos y cambios de
estado. NestJS para Catálogo porque es un servicio simple (lectura y
administración, sin eventos) y Nest da esa estructura rápido.

**Archivo:** `docs/decisiones.md` → D2.

---

### 15. ¿Cómo se valida el JWT en cada servicio, no solo en el Gateway?

**Responsable: Jesús**

El Gateway valida la firma antes de enrutar, pero cada servicio **vuelve a
validarla** con el mismo `JWT_SECRET` y revisa el rol del claim — si
alguien llega directo por la red interna de Docker, sin pasar por el
Gateway, igual lo rechaza.

**Archivo:** `apps/negociacion/.../auth.middleware.js`;
`apps/pedidos/.../JwtAuthFilter.java`; `apps/identidad/accounts/permissions.py`.

---

### 16. ¿Qué es la arquitectura limpia acá, en código real?

**Responsable: Jesús**

`domain/` no importa nada del framework (ni Express, ni JPA, ni DRF): son
clases o funciones puras con la regla de negocio. `application/` solo
conoce interfaces (repositorios, el `UnitOfWork`); la implementación real
vive en `infrastructure/`. `presentation/` (controllers/vistas) es
delgado: valida y delega, nunca decide una regla.

**Archivo:** cualquier servicio, por ejemplo `apps/identidad/accounts/services/`
(la regla vive ahí, no en `views.py`).

---

### 17. ¿Cómo funciona el patrón smart/dumb en Angular?

**Responsable: Jesús**

Cada pantalla tiene un componente *smart* que habla con el backend a
través de una *facade* y guarda su estado en *signals*; los componentes
reutilizables son *dumb* — reciben datos por `input()`, avisan por
`output()`, nunca llaman a la API. `OfferCardComponent` es el ejemplo: la
usan el comparador del comprador y "Mis ofertas" del proveedor, con botones
distintos, sin duplicar el componente.

**Archivo:** `apps/frontend/src/app/facades/auth.facade.ts`;
`apps/frontend/src/app/shared/offer-card/offer-card.component.ts`.

---

### 18. ¿Qué pasa si el mismo `OFFER_ACCEPTED` llega dos veces?

**Responsable: Dylan**

Dos niveles: si llega con el mismo `event_id` (reintento normal de
RabbitMQ), `processed_events` lo detiene antes de hacer nada. Si llegara
con un `event_id` **distinto** pero el mismo `offer_id` (por ejemplo, un
reenvío manual), el índice único de `orders.offer_id` lo frena igual — se
marca como procesado sin crear un segundo pedido.

**Archivo:** `apps/pedidos/.../CreateOrderFromOfferAcceptedTest.java`
(`esIdempotenteConElMismoEventId`, `offerIdDuplicadoConEventIdDistintoSeMarcaProcesadoSinCrearOtroPedido`).

---

### 19. ¿Qué mejorarían con más tiempo?

**Responsable: Ambos**

- La unicidad de nombre de categoría (sin distinguir mayúsculas) no tiene
  respaldo de índice en la base, solo validación en la aplicación — un
  índice funcional (`LOWER(name)`) la cerraría del todo.
- La carrera "aceptar mientras se retira la misma oferta" está cubierta
  por el diseño (el lock de la solicitud) pero no con tráfico concurrente
  real, a diferencia de la de aceptar dos veces.
- Catálogo usa `synchronize`/`sync()` según el servicio en vez de
  migraciones versionadas en todos; Pedidos ya usa Flyway.

**Archivo:** `docs/defensa/fase-2-catalogo.md` (limitaciones);
`docs/defensa/fase-2-negociacion.md` (limitaciones).
