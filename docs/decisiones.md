# Decisiones del proyecto

Cada decisión tiene el **qué**, el **por qué** y una **frase para la defensa**.
El PDF permite ajustar la arquitectura de referencia "siempre que cada
servicio tenga una responsabilidad clara, su propio modelo de dominio y una
separación adecuada de datos".

---

## D1. Cinco servicios: Solicitudes y Ofertas se unen en Negociación

**Qué:** Identidad, Negociación (solicitudes y ofertas), Pedidos, Catálogo y
Notificaciones, más el Gateway.

**Por qué:** la regla principal, "una sola oferta aceptada **por solicitud**",
involucra a la solicitud y a todas sus ofertas. Juntas, aceptar una oferta,
rechazar las demás y cerrar la solicitud ocurre en una sola transacción.
Separadas, cada una con sus datos, había que coordinarlas por mensajes, con
riesgo de datos atrasados, avisos perdidos y cambios que deshacer. Pedidos
queda aparte porque empieza cuando termina la negociación y tiene su propio
ciclo de vida.

> "Unimos Solicitudes y Ofertas porque la regla principal involucra a las
> dos: así aceptar una oferta, rechazar las demás y cerrar la solicitud es un
> solo paso. Pedidos queda aparte porque tiene su propio ciclo de vida."

---

## D2. Un framework por servicio según lo que mejor hace

| Servicio | Framework | Por qué |
|---|---|---|
| Identidad | Django | Lo exige la consigna; trae usuarios, contraseñas y panel de administración |
| Negociación | Express | Ya existía en Express; se le agregaron las ofertas |
| Pedidos | Spring Boot | Mensajería con RabbitMQ y transacciones muy maduras; ideal para un servicio que vive de eventos y cambios de estado |
| Catálogo | NestJS | Registro y listado simples; rápido de construir y similar a Express |
| Notificaciones | Express | Reutiliza el código de mensajería de Negociación |
| Gateway | Express | Ya existía; solo enruta y valida el token |

> "Elegimos cada framework por lo que mejor resuelve: Spring para el servicio
> que más depende de mensajes y estados, Nest para un catálogo simple, y
> Express donde ya teníamos código."

---

## D3. Una sola base de datos, un esquema por servicio

**Qué:** un PostgreSQL (`repuestosya`) con los esquemas `identidad`,
`negociacion`, `pedidos`, `catalogo` y `notificaciones`. Cada servicio tiene
su propio usuario de base de datos, con permisos solo sobre su esquema.

**Por qué:** cumple la consigna (una sola base) y el criterio del PDF
("cada microservicio administra sus propios datos"). Evita que cuatro
frameworks creen tablas en el mismo lugar y choquen entre sí.

> "Usamos una sola base, como pide la consigna, pero cada servicio es dueño
> de su esquema y no accede a los de otros. Si necesita datos ajenos, los pide
> por API o los recibe por eventos."

---

## D4. Docker desde el día 1

**Qué:** `docker compose up --build` levanta todo desde la primera fase, y
cada fase termina comprobando el flujo dentro de Docker.

**Por qué:** evita descubrir al final que los servicios no se encuentran, que
arrancan antes que la base o que no compilan dentro de una imagen.

> "Todo el sistema se levanta con un solo comando; lo mantuvimos funcionando
> así desde el primer día."

---

## D5. Notificaciones solo dentro de la aplicación, desde el inicio

**Qué:** el servicio escucha los eventos y guarda avisos que el usuario ve en
una campanita. Sin correo. Se construye desde la primera fase y crece con
cada evento nuevo.

**Por qué:** muestra la comunicación por eventos en todo el flujo, sin
depender de servicios externos de correo.

---

## D6. Perfil comercial del proveedor en Identidad, aprobado por el admin

**Qué:** el proveedor registra nombre comercial, ciudad, teléfono y
categorías que atiende. Queda `PENDING` hasta que el admin lo aprueba. Solo un
proveedor `APPROVED` puede enviar ofertas.

**Por qué:** el perfil pertenece al usuario; no justifica un servicio propio.

---

## D7. Panel de administración en Angular

**Qué:** el admin aprueba o rechaza proveedores y gestiona categorías. Las
categorías básicas vienen precargadas.

---

## D8. Pago simulado con pantalla de QR o tarjeta

**Qué:** al generarse el pedido queda en `PENDING_PAYMENT`. El comprador ve
una pantalla para "pagar" con QR o tarjeta; al confirmar, Pedidos registra el
pago simulado y el pedido pasa a `PREPARING`. Nunca se envían ni guardan datos
reales de tarjeta.

**Por qué:** el PDF permite simular la confirmación de compra. Registrarla en
Pedidos deja el paso visible y defendible.

> "La pasarela es un adaptador simulado: si mañana se conecta una real, solo
> se cambia ese adaptador."

---

## D9. Estados sugeridos por el PDF

- **Solicitud:** `PUBLISHED` → `RECEIVING_OFFERS` → `OFFER_ACCEPTED` →
  `COMPLETED` (o `CANCELLED`).
- **Pedido:** `PENDING_PAYMENT` → `PREPARING` → `IN_TRANSIT` (entrega) o
  `READY_FOR_PICKUP` (retiro) → `DELIVERED` → `COMPLETED`.

---

## D10. Los eventos no se pierden ni se procesan dos veces

**Qué:** Negociación y Pedidos usan **outbox** (el evento se guarda en la
misma transacción que el cambio y se publica después). Todo consumidor
registra el `event_id` procesado y salta duplicados.

**Por qué:** RabbitMQ puede estar caído un momento o entregar un mensaje dos
veces. Sin esto, un proveedor podría no ver una solicitud o se crearían dos
pedidos.

> "Garantizamos que todo cambio importante publique su evento y que ningún
> evento se procese dos veces."

---

## D11. Copias locales en lugar de preguntar a otro servicio

**Qué:** Negociación y Notificaciones guardan una copia de los proveedores
aprobados (ciudad y categorías), alimentada por los eventos de Identidad.
Pedidos guarda los datos de la oferta que recibe en `OFFER_ACCEPTED`.

**Por qué:** cada servicio puede trabajar aunque otro esté caído, y no hay
consultas entre esquemas.

**Excepción consciente:** al crear una solicitud, Negociación consulta a
Catálogo por HTTP que la categoría exista y esté activa. Es un dato de
referencia que se lee una sola vez.

---

## D12. Nombres de eventos

Se usa la convención del repositorio (`OFFER_ACCEPTED`). Equivalencia con el
PDF:

| PDF | Proyecto |
|---|---|
| PartRequestCreated | `PART_REQUEST_CREATED` |
| OfferSubmitted | `OFFER_SUBMITTED` |
| OfferAccepted | `OFFER_ACCEPTED` |
| OrderCreated | `ORDER_CREATED` |
| OrderStatusChanged | `ORDER_STATUS_CHANGED` |

---

## D13. Frontend Angular con componentes smart y dumb

**Qué:** cada pantalla tiene un componente *smart* que habla con el backend a
través de un servicio *facade*; los demás componentes son *dumb* (reciben
datos por `input` y avisan por `output`).

**Por qué:** es el patrón visto en clase y facilita reutilizar componentes,
como la tarjeta de oferta en el comparador y en "mis ofertas".
