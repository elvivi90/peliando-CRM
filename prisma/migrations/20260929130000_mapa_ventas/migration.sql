-- Mapa de ventas en Reportes: destino del envio de las ventas de Tiendup y
-- cache de coordenadas de los lugares ya buscados.
ALTER TABLE "ventas" ADD COLUMN "envioLocalidad" TEXT,
ADD COLUMN "envioProvincia" TEXT;

CREATE TABLE "geocodificaciones" (
    "id" TEXT NOT NULL,
    "consulta" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "localidad" TEXT,
    "provincia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geocodificaciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "geocodificaciones_consulta_key" ON "geocodificaciones"("consulta");
