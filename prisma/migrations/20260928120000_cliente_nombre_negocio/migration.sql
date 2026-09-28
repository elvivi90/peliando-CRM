-- Nombre del negocio para mayoristas y distribuidores (nombre y apellido
-- pasan a ser el contacto). Los existentes quedan en null hasta que se
-- editen.
ALTER TABLE "clientes" ADD COLUMN "nombreNegocio" TEXT;
