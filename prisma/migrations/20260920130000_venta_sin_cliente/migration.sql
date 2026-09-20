-- La "venta rapida" (minorista, ideal para eventos) se registra sin cliente.
-- Las ventas existentes no cambian.
ALTER TABLE "ventas" ALTER COLUMN "clienteId" DROP NOT NULL;
