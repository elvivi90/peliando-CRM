-- Envios por Correo Argentino (uno por venta como maximo) y recargas del
-- saldo de la cuenta de Correo, que se carga a mano.
CREATE TYPE "EstadoEnvio" AS ENUM ('POR_ENVIAR', 'ENVIADO', 'ENTREGADO', 'ERROR_CREACION');

CREATE TABLE "envios" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'POR_ENVIAR',
    "trackingNumber" TEXT,
    "costoEnvioReal" DECIMAL(12,2),
    "errorMensaje" TEXT,
    "destinatarioNombre" TEXT NOT NULL,
    "destinatarioEmail" TEXT NOT NULL,
    "destinatarioTelefono" TEXT,
    "calle" TEXT NOT NULL,
    "numeroCalle" TEXT NOT NULL,
    "piso" TEXT,
    "departamento" TEXT,
    "barrio" TEXT,
    "localidad" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "codigoPostal" TEXT NOT NULL,
    "ultimoEvento" TEXT,
    "ultimaConsultaTracking" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "envios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recargas_correo" (
    "id" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recargas_correo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "envios_ventaId_key" ON "envios"("ventaId");
CREATE UNIQUE INDEX "envios_numero_key" ON "envios"("numero");
CREATE INDEX "envios_estado_idx" ON "envios"("estado");
CREATE INDEX "recargas_correo_fecha_idx" ON "recargas_correo"("fecha");

ALTER TABLE "envios" ADD CONSTRAINT "envios_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recargas_correo" ADD CONSTRAINT "recargas_correo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
