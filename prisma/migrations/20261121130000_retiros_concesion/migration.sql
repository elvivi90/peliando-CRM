-- Concesionarios que son punto de retiro de Tiendup: lo que los clientes
-- retiran ahi sale del saldo de su concesion, no del stock del producto.
ALTER TABLE "clientes" ADD COLUMN "sucursalTiendup" TEXT;
CREATE UNIQUE INDEX "clientes_sucursalTiendup_key" ON "clientes"("sucursalTiendup");

CREATE TABLE "retiros_concesion" (
    "id" TEXT NOT NULL,
    "concesionId" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retiros_concesion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "retiros_concesion_ventaId_idx" ON "retiros_concesion"("ventaId");

ALTER TABLE "retiros_concesion" ADD CONSTRAINT "retiros_concesion_concesionId_fkey" FOREIGN KEY ("concesionId") REFERENCES "concesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "retiros_concesion" ADD CONSTRAINT "retiros_concesion_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Noir cafe y peliculas: unico punto de retiro con concesion por ahora.
UPDATE "clientes" SET "sucursalTiendup" = 'NOIR café y películas'
WHERE "nombreNegocio" ILIKE 'noir%' AND "tipo" IN ('MAYORISTA', 'DISTRIBUIDOR');
