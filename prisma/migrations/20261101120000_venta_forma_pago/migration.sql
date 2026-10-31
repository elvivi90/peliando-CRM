-- Forma de pago de las ventas cargadas a mano (posnet, efectivo o
-- transferencia). Opcional: las ventas existentes y las de Tiendup quedan en null.
CREATE TYPE "FormaPago" AS ENUM ('POSNET', 'EFECTIVO', 'TRANSFERENCIA');

ALTER TABLE "ventas" ADD COLUMN "formaPago" "FormaPago";
