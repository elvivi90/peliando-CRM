-- Cobros por Mercado Pago de las ventas de Tiendup (uno por venta como
-- maximo): comisiones, neto y fecha de liberacion de la plata.
CREATE TABLE "pagos_mercadopago" (
    "id" TEXT NOT NULL,
    "mpPaymentId" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "tipoMedio" TEXT NOT NULL,
    "medioPago" TEXT NOT NULL,
    "cuotas" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "comisionMercadoPago" DECIMAL(12,2) NOT NULL,
    "costoFinanciacion" DECIMAL(12,2) NOT NULL,
    "neto" DECIMAL(12,2) NOT NULL,
    "fechaAprobado" TIMESTAMP(3) NOT NULL,
    "fechaLiberacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_mercadopago_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pagos_mercadopago_mpPaymentId_key" ON "pagos_mercadopago"("mpPaymentId");
CREATE UNIQUE INDEX "pagos_mercadopago_ventaId_key" ON "pagos_mercadopago"("ventaId");
CREATE INDEX "pagos_mercadopago_fechaLiberacion_idx" ON "pagos_mercadopago"("fechaLiberacion");

ALTER TABLE "pagos_mercadopago" ADD CONSTRAINT "pagos_mercadopago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
