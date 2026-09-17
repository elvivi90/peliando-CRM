# CRM Peliando

CRM interno para llevar la contabilidad de ventas de Peliando (juego de mesa
de debate sobre películas): clientes, lista de precios versionada, ventas
(minorista, mayorista, distribuidor y concesión), cuenta corriente, eventos,
gastos y reportes mensuales. Ver `docs/Especificaciones — CRM Peliando.docx`
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
4. Copiar `.env.example` a `.env` y completar los 5 valores anteriores, más
   un `TIENDUP_WEBHOOK_SECRET` propio (cualquier string largo y random).

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

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm run start` — build de producción
- `npm run lint` — ESLint
- `npm run db:migrate` — aplica el schema de Prisma a la base
- `npm run db:seed` — carga datos de ejemplo (producto + lista de precios)
- `npm run db:studio` — abre Prisma Studio para inspeccionar los datos

## Decisiones de diseño no explícitas en la especificación

- **Cuenta corriente** (sección 4.2) se calcula al vuelo a partir de `Venta`
  en vez de guardarse como tabla aparte: cada `Venta` tiene `montoCobrado`
  (espejo de `cantidadEntregada`, pero para plata en vez de unidades), y
  `saldo_pendiente_cobro` es `precioTotal - montoCobrado` sumado por
  cliente. Evita una entidad `Pago` que la especificación no pedía y
  mantiene todo consistente con un único registro de verdad.
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
- **Webhook de Tiendup** (`/api/webhooks/tiendup`): como no había
  documentación del payload real de Tiendup, se definió un contrato propio
  razonable (ver comentario al inicio de
  `src/app/api/webhooks/tiendup/route.ts`) que hay que ajustar cuando se
  tenga acceso a la webhook real de Tiendup. Se protege con un secreto
  compartido (`TIENDUP_WEBHOOK_SECRET`) enviado en el header
  `x-webhook-secret`.
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
