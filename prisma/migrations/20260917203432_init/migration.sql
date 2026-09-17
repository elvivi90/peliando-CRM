-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('MINORISTA', 'MAYORISTA', 'DISTRIBUIDOR', 'CONCESION');

-- CreateEnum
CREATE TYPE "EstadoLista" AS ENUM ('ACTIVA', 'HISTORICA');

-- CreateEnum
CREATE TYPE "TipoVenta" AS ENUM ('MINORISTA', 'MAYORISTA', 'DISTRIBUIDOR', 'CONCESION');

-- CreateEnum
CREATE TYPE "OrigenVenta" AS ENUM ('MANUAL', 'WEBHOOK_TIENDUP');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('TRANSPORTE', 'COMIDA', 'MARKETING_PRODUCCION', 'OTROS');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "tipo" "TipoCliente" NOT NULL,
    "precioParticular" DECIMAL(12,2),
    "listaPrecioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listas_de_precios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicioVigencia" TIMESTAMP(3) NOT NULL,
    "fechaFinVigencia" TIMESTAMP(3),
    "estado" "EstadoLista" NOT NULL DEFAULT 'ACTIVA',
    "pvp" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listas_de_precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tramos_de_precio" (
    "id" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "cantidadDesde" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "tramos_de_precio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "lugar" TEXT,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "eventoId" TEXT,
    "tipo" "TipoVenta" NOT NULL,
    "listaId" TEXT,
    "tramoId" TEXT,
    "cantidad" INTEGER NOT NULL,
    "cantidadEntregada" INTEGER NOT NULL DEFAULT 0,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "precioTotal" DECIMAL(12,2) NOT NULL,
    "montoCobrado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "origen" "OrigenVenta" NOT NULL DEFAULT 'MANUAL',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concesiones" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadEntregada" INTEGER NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidaciones_concesion" (
    "id" TEXT NOT NULL,
    "concesionId" TEXT NOT NULL,
    "cantidadVendida" INTEGER NOT NULL,
    "montoCobrado" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ventaId" TEXT,

    CONSTRAINT "liquidaciones_concesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devoluciones_concesion" (
    "id" TEXT NOT NULL,
    "concesionId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devoluciones_concesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "eventoId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_authId_key" ON "usuarios"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE INDEX "clientes_tipo_idx" ON "clientes"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "tramos_de_precio_listaId_cantidadDesde_key" ON "tramos_de_precio"("listaId", "cantidadDesde");

-- CreateIndex
CREATE INDEX "ventas_fecha_idx" ON "ventas"("fecha");

-- CreateIndex
CREATE INDEX "ventas_tipo_idx" ON "ventas"("tipo");

-- CreateIndex
CREATE INDEX "ventas_clienteId_idx" ON "ventas"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "liquidaciones_concesion_ventaId_key" ON "liquidaciones_concesion"("ventaId");

-- CreateIndex
CREATE INDEX "gastos_fecha_idx" ON "gastos"("fecha");

-- CreateIndex
CREATE INDEX "gastos_categoria_idx" ON "gastos"("categoria");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_listaPrecioId_fkey" FOREIGN KEY ("listaPrecioId") REFERENCES "listas_de_precios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramos_de_precio" ADD CONSTRAINT "tramos_de_precio_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "listas_de_precios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "listas_de_precios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_tramoId_fkey" FOREIGN KEY ("tramoId") REFERENCES "tramos_de_precio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concesiones" ADD CONSTRAINT "concesiones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concesiones" ADD CONSTRAINT "concesiones_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_concesion" ADD CONSTRAINT "liquidaciones_concesion_concesionId_fkey" FOREIGN KEY ("concesionId") REFERENCES "concesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_concesion" ADD CONSTRAINT "liquidaciones_concesion_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones_concesion" ADD CONSTRAINT "devoluciones_concesion_concesionId_fkey" FOREIGN KEY ("concesionId") REFERENCES "concesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
