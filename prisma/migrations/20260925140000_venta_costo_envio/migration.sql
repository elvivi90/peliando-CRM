-- Costo de envio que paga Peliando por cada venta. Las ventas existentes
-- quedan en 0.
ALTER TABLE "ventas" ADD COLUMN "costoEnvio" DECIMAL(12,2) NOT NULL DEFAULT 0;
