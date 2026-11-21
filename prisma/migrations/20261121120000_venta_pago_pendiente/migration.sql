-- Ventas de Tiendup por transferencia que se crean al hacerse la orden y
-- quedan esperando que se confirme el pago en el panel de Tiendup.
ALTER TABLE "ventas" ADD COLUMN "pagoPendiente" BOOLEAN NOT NULL DEFAULT false;

-- Codigo de la orden en el panel de Tiendup, para linkear al detalle.
ALTER TABLE "ventas" ADD COLUMN "tiendupHash" TEXT;
