# @repuestos/shared

Tipos, enums y contratos compartidos entre microservicios.

## Regla de oro

> **Solo tipos y contratos. Nunca lógica de negocio.**

Si este paquete empieza a acumular funciones con reglas del negocio, deja de
ser un monorepo y se convierte en un monolito disfrazado de microservicios.
Cada servicio debe poder evolucionar su dominio sin que otro se rompa.

## Qué va aquí

- Enums de estados y tipos (`OfferStatus`, `OrderStatus`, `Condition`).
- Interfaces de los payloads de eventos.
- Interfaces de los DTOs de respuesta.
- Roles de usuario.

## Qué NO va aquí

- Funciones con reglas de negocio.
- Modelos de base de datos.
- Lógica de validación de un servicio concreto.
- Dependencias de Express, Sequelize o Django.

## Uso

```javascript
const { OfferStatus, buildOfferAcceptedEvent } = require('@repuestos/shared');
```

```typescript
import { OrderStatus, OfferAcceptedEvent } from '@repuestos/shared';
```

> Nota: el empaquetado con workspaces (pnpm/npm/yarn) se configura cuando el
> equipo lo decida. Por ahora los archivos viven aquí como fuente de verdad.
