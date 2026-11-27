# Fases 4 a 7 — Integración, calidad, defensa y ensayo (12 al 15)

---

## Fase 4 — Integración (jueves 12)

**Objetivo:** el flujo completo pasa de forma automática con Docker limpio y
hay datos de prueba listos para la demo.

### Prompt (bloque A): script del flujo y datos de prueba

```
Lee AGENTS.md, docs/flujo-principal.md y docs/contratos-api.md.

Fase 4:
1. Crea scripts/e2e-flujo.mjs (Node 20, solo fetch, sin dependencias) que,
   contra http://localhost:4000/api/v1, recorra los 13 pasos de
   docs/flujo-principal.md con usuarios nuevos (email con marca de tiempo):
   registro de comprador y dos proveedores, perfiles, aprobación con el admin
   (ADMIN_EMAIL y ADMIN_PASSWORD de .env), solicitud, dos ofertas, aceptar
   una, comprobar 409 al aceptar la otra, esperar el pedido, pagar, avanzar
   estados, confirmar y comprobar la solicitud COMPLETED y que existan
   avisos. Imprime ✓ o ✗ por paso y termina con código 1 si algo falla.
   Las esperas por eventos reintentan cada segundo hasta 15 s.
2. Crea scripts/seed-demo.mjs que, usando la API, deje listos para la demo:
   comprador@demo.bo, proveedor1@demo.bo y proveedor2@demo.bo (contraseña en
   .env.example), proveedores aprobados, dos vehículos y una solicitud con
   dos ofertas. Si ya existen, no los duplica.
3. Documenta ambos en el README.

Muéstrame el plan antes de escribir código.
Terminado cuando, después de docker compose down -v && docker compose up
--build, node scripts/e2e-flujo.mjs termina con todo en ✓.
```

### Prompt (bloque B): corrección de pantallas

```
Lee AGENTS.md y docs/frontend.md. Recorre todas las pantallas de
docs/frontend.md contra el backend en Docker y haz una lista de lo que falla
o falta (pantalla, qué pasa, qué debería pasar). Muéstrame la lista antes de
corregir. Luego corrige en orden de importancia para el flujo principal.
```

---

## Fase 5 — Calidad (viernes 13)

**Objetivo:** pruebas completas de las reglas, revisión cruzada y errores
bien mostrados.

### Prompt: revisión cruzada (cada uno revisa el bloque del otro)

```
Lee AGENTS.md y la skill code-review-security. Revisa el código de
[apps/... del otro bloque] contra AGENTS.md, docs/ y la skill. Busca: reglas
de negocio fuera del dominio, accesos a esquemas ajenos, endpoints sin
validación de JWT o de rol, secretos en el código, datos de tarjeta,
consumidores no idempotentes y respuestas fuera del sobre {status, msg, data}.
Entrega una lista priorizada (archivo, línea, problema, cómo corregirlo).
No corrijas nada todavía.
```

### Prompt: pruebas faltantes

```
Lee docs/flujo-principal.md, sección "Casos que siempre deben probarse", y la
skill testing-quality. Para cada caso, dime si existe una prueba que lo cubra
(archivo y nombre) o si falta. Luego escribe las que faltan y córrelas.
Dime el resultado real.
```

---

## Fase 6 — Defensa (sábado 14)

**Objetivo:** cualquiera levanta el proyecto con el README y ustedes saben
explicar cada parte.

### Prompt

```
Lee AGENTS.md, docs/decisiones.md y todos los archivos de docs/defensa/.
1. Revisa el README: que alguien sin contexto pueda clonar, copiar .env,
   levantar con Docker, cargar los datos de demo y abrir la app. Corrige lo
   que falte.
2. Crea docs/defensa/guion-demo.md: el recorrido de la demo en 10 minutos
   (qué usuario, qué pantalla, qué mostrar en RabbitMQ y en la base) y qué
   decir en cada paso.
3. Crea docs/defensa/preguntas.md: 15 preguntas probables del docente con
   respuestas cortas y simples (por qué 5 servicios, por qué un esquema por
   servicio, cómo se garantiza una sola oferta aceptada, qué pasa si RabbitMQ
   se cae, qué patrón hay en cada servicio, cómo se aplica CQRS, por qué cada
   framework, etc.), basadas en el código real.
No inventes nada que no esté implementado.
```

Opcional, si sobra tiempo: diagramas C4 (contexto y contenedores) en
`docs/defensa/c4.md`.

---

## Fase 7 — Ensayo y margen (domingo 15)

Sin prompt nuevo. Lista:

- [ ] Clonar el repositorio en una carpeta nueva y seguir solo el README.
- [ ] `docker compose down -v && docker compose up --build` y luego
      `node scripts/seed-demo.mjs`.
- [ ] `node scripts/e2e-flujo.mjs` con todo en ✓.
- [ ] Ensayar el guion de la demo dos veces, cronometrado. Cada uno explica
      el bloque del otro al menos una vez.
- [ ] Merge de `develop` a `main` y etiqueta `v1.0`.
- [ ] Llevar el proyecto ya construido en la computadora de la demo (las
      imágenes de Spring y Angular tardan en construirse).
