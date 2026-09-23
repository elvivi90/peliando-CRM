# CRM Peliando

CRM interno para llevar la contabilidad de ventas de Peliando (juego de mesa
de debate sobre películas): clientes, lista de precios versionada, ventas
(minorista, mayorista y distribuidor), concesiones a mayoristas y
distribuidores, cuenta corriente, eventos, gastos y reportes mensuales. Ver `docs/Especificaciones — CRM Peliando.docx`
para la especificación completa.

Next.js (App Router) + Prisma + PostgreSQL/Auth vía Supabase, pensado como
PWA instalable (sin publicar en las tiendas de apps).

## Stack

- **Frontend + backend**: Next.js 16 (React 19), Tailwind CSS 4
- **Base de datos**: PostgreSQL vía Supabase, con Prisma como ORM
- **Auth**: Supabase Auth (los 4 usuarios del equipo, todos rol Admin)
- **Gráficos**: Recharts
- **Hosting sugerido**: Vercel (frontend/API) + Supabase (DB/Auth)

## Setup

### 1. Crear el proyecto de Supabase

1. Crear un proyecto nuevo en [supabase.com](https://supabase.com) (plan free alcanza).
2. En **Project Settings → Database → Connection string**, copiar:
   - La conexión **Transaction pooler** (puerto 6543) → `DATABASE_URL`
   - La conexión **directa** (puerto 5432) → `DIRECT_URL`
3. En **Project Settings → API**, copiar `Project URL` y `anon public key` y
   `service_role key`.
4. Copiar `.env.example` a `.env` y completar los 5 valores anteriores. Las
   variables de Tiendup (`TIENDUP_API_KEY`, `TIENDUP_WEBHOOK_SECRET`) se
   completan más adelante, cuando se configure esa integración (ver abajo).

### 2. Crear los 4 usuarios del equipo

En Supabase Dashboard → **Authentication → Users → Add user**, crear una
cuenta (email + password) por cada persona del equipo. No hace falta crear
nada más: la primera vez que cada uno inicia sesión, la app crea
automáticamente su fila en la tabla `Usuario` (ver `src/lib/auth.ts`). Todos
comparten el mismo rol Admin, sin permisos diferenciados.

### 3. Instalar dependencias y aplicar el schema

```bash
npm install
npm run db:migrate   # crea las tablas en Supabase (prisma migrate dev)
npm run db:seed      # carga un producto y una lista de precios de ejemplo
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). Redirige a `/login`,
y de ahí a `/dashboard` una vez autenticado.

### 5. (Opcional) Base local para pruebas

Para probar el webhook de Tiendup, una migración nueva, o cualquier cosa
que escriba datos sin tocar la base real, ver
[`docs/db-local.md`](docs/db-local.md) — un Postgres local con Docker,
aislado de producción.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm run start` — build de producción
- `npm run lint` — ESLint
- `npm run db:migrate` — aplica el schema de Prisma a la base
- `npm run db:seed` — carga datos de ejemplo (producto + lista de precios)
- `npm run db:studio` — abre Prisma Studio para inspeccionar los datos
- `npm run dev:local` / `db:local:*` — mismos comandos, pero contra el
  Postgres local de Docker en vez de la base real (ver
  [`docs/db-local.md`](docs/db-local.md))

## Decisiones de diseño no explícitas en la especificación

- **Cuenta corriente** (sección 4.2) se calcula al vuelo a partir de `Venta`
  en vez de guardarse como tabla aparte: cada `Venta` tiene `montoCobrado`
  (espejo de `cantidadEntregada`, pero para plata en vez de unidades), y
  `saldo_pendiente_cobro` es `precioTotal - montoCobrado` sumado por
  cliente. Evita una entidad `Pago` que la especificación no pedía y
  mantiene todo consistente con un único registro de verdad.
- **Concesión no es un tipo de cliente** (`TipoCliente` solo tiene minorista,
  mayorista y distribuidor): es una modalidad de entrega que se crea
  únicamente desde la ficha de un cliente mayorista o distribuidor — no
  aparece en Nueva Venta ni aplica a minoristas. La mercadería entregada sale
  del stock general pero no es venta hasta que se registra una liquidación;
  una devolución resta de lo entregado y vuelve al stock del producto.
- **`Venta.tipo`** incluye `CONCESION` además de minorista/mayorista/
  distribuidor: cuando se liquida una concesión (sección 4.3) se genera una
  Venta real retroactiva, y necesita un tipo propio para no mezclarse con
  ventas mayoristas/distribuidor normales.
- **Stock**: se descuenta al cargar la venta (no al entregarla), excepto en
  ventas generadas por liquidación de concesión, donde el stock ya se
  descontó en la entrega inicial en concesión.
- **Producto**: la especificación lo modela como entidad propia aunque hoy
  exista un solo juego; se agregó un CRUD simple (`/productos`) para poder
  sumar variantes (ediciones, expansiones) sin tocar el schema.
- **Webhook de Tiendup** (`/api/webhooks/tiendup`): crea una venta minorista
  cuando se confirma el pago de una orden en Tiendup. El endpoint solo usa el
  evento del webhook para sacar el id de la orden; el resto de los datos
  (cliente, items, monto) se traen de la fuente de verdad,
  `GET /orders/{id}` de la API pública de Tiendup. Detalle completo del
  diseño y las decisiones tomadas en el comentario al inicio de
  `src/app/api/webhooks/tiendup/route.ts`.

  **Setup en el panel de Tiendup:**
  1. Configuraciones → API → generar una API Key → pegarla en
     `TIENDUP_API_KEY`.
  2. Configuraciones → Webhooks → crear webhook con la URL
     `https://<tu-dominio>/api/webhooks/tiendup`, suscripto **solo** al
     evento `orders.payment_paid` (no `orders.creation`, que puede no
     llegar a pagarse nunca).
  3. Tiendup genera un secreto propio para firmar los requests — pegarlo tal
     cual en `TIENDUP_WEBHOOK_SECRET` (no inventar uno).
  4. Usar el botón "enviar evento de prueba" de Tiendup para validar que el
     endpoint responde 200. El algoritmo de firma (HMAC-SHA256 sobre el body
     crudo) es una suposición basada en la convención estándar de la
     industria — no está documentado públicamente —, así que si la prueba
     da 401 hay que revisar ese punto puntual.
- **PWA**: manifest + service worker mínimo (sin cacheo, para que los datos
  siempre estén frescos) — alcanza para "Agregar a pantalla de inicio" en
  Android/iOS sin pasar por las tiendas de apps.

## Deploy

1. Subir el repo a GitHub.
2. Importarlo en [Vercel](https://vercel.com/new) y cargar las mismas
   variables de entorno de `.env` en **Project Settings → Environment
   Variables**.
3. Vercel corre `npm run build` automáticamente; `postinstall` ya ejecuta
   `prisma generate`. Las migraciones (`npm run db:migrate`) se corren a
   mano (o desde CI) contra la base de Supabase antes de cada deploy con
   cambios de schema.
