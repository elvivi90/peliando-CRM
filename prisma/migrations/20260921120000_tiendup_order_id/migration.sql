-- Id de la orden de Tiendup, unico: permite que la idempotencia del webhook
-- dependa de una restriccion de la base (choca en el insert) en vez de un
-- SELECT previo, que deja una ventana para duplicar la venta si Tiendup
-- reintenta la entrega del mismo evento casi al mismo tiempo.
ALTER TABLE "ventas" ADD COLUMN "tiendupOrderId" INTEGER;
CREATE UNIQUE INDEX "ventas_tiendupOrderId_key" ON "ventas"("tiendupOrderId");
