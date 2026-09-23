# Base de datos local para pruebas

Para probar cosas que escriben datos (el webhook de Tiendup, migraciones
nuevas, cambios de schema) sin tocar la base real de Supabase, hay un
Postgres local levantado con Docker.

## ⚠️ Lo mas importante

**Los comandos sin `:local` siguen yendo a la base real**, la misma que usa
producción. `npm run db:migrate`, `npm run db:seed`, `npm run db:studio` y
`npm run dev` (sin sufijo) usan `DATABASE_URL`/`DIRECT_URL` de `.env`, que
apuntan a Supabase. Los que dicen `:local` en el nombre son los únicos que
usan la base local — no hay nada automático que cambie de una a otra, así
que hay que fijarse siempre qué comando se corre.

## Setup (una vez)

1. Tener [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   instalado y corriendo.
2. Copiar el archivo de variables:
   ```bash
   cp .env.docker.example .env.docker
   ```
   No hace falta editarlo — ya apunta al Postgres que levanta
   `docker-compose.yml`. El resto de las variables (login de Supabase,
   Tiendup) se siguen tomando de `.env`: el login y las llamadas a Tiendup
   usan los servicios reales igual, solo los *datos* de la app (clientes,
   ventas, productos, etc.) quedan en esta base local.
3. Levantar el contenedor y aplicar el schema:
   ```bash
   npm run db:local:up
   npm run db:local:migrate
   npm run db:local:seed   # opcional: carga un producto y una lista de precios de ejemplo
   ```

## Uso normal

```bash
npm run dev:local          # la app, apuntando a la base local
npm run db:local:studio    # Prisma Studio sobre la base local
npm run db:local:migrate   # aplicar una migracion nueva a la base local
```

Al iniciar sesión con `dev:local`, como el login sigue siendo el Supabase
Auth real, la primera vez crea automáticamente tu fila de `Usuario` en la
base local (igual que pasa en la base real la primera vez que cada persona
entra — ver `src/lib/auth.ts`).

## Apagar / reiniciar de cero

```bash
npm run db:local:down                 # apaga el contenedor, conserva los datos
docker compose down -v                # apaga y borra todos los datos locales
```

## Por qué existe esto

Antes de esto, probar el webhook de Tiendup (o cualquier cosa que
escribiera datos) significaba hacerlo contra la base real — lo cual en un
momento dejó una venta y un cliente de prueba mezclados con datos reales
del negocio, que hubo que revertir a mano. Con la base local, esas pruebas
quedan aisladas.
