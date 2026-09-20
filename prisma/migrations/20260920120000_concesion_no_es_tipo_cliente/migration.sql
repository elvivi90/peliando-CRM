-- Concesion deja de ser un tipo de cliente: pasa a ser una modalidad de
-- entrega que se crea desde la ficha de un cliente MAYORISTA.
-- Los clientes que hoy tienen tipo CONCESION se convierten en MAYORISTA
-- (sus Concesion/Liquidaciones/Ventas historicas quedan intactas).
UPDATE "clientes" SET "tipo" = 'MAYORISTA' WHERE "tipo" = 'CONCESION';

-- Postgres no permite quitar un valor de un enum: se recrea el tipo.
ALTER TYPE "TipoCliente" RENAME TO "TipoCliente_old";
CREATE TYPE "TipoCliente" AS ENUM ('MINORISTA', 'MAYORISTA', 'DISTRIBUIDOR');
ALTER TABLE "clientes" ALTER COLUMN "tipo" TYPE "TipoCliente" USING ("tipo"::text::"TipoCliente");
DROP TYPE "TipoCliente_old";
