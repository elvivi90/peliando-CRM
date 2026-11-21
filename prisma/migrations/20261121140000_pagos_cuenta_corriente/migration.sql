-- Pagos a cuenta de mayoristas y distribuidores (se reparten entre sus
-- ventas pendientes de cobro; esto es el historial).
CREATE TABLE "pagos_cuenta_corriente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "formaPago" "FormaPago",
    "fecha" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_cuenta_corriente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pagos_cuenta_corriente_clienteId_idx" ON "pagos_cuenta_corriente"("clienteId");

ALTER TABLE "pagos_cuenta_corriente" ADD CONSTRAINT "pagos_cuenta_corriente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pagos_cuenta_corriente" ADD CONSTRAINT "pagos_cuenta_corriente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
