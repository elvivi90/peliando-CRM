-- Distingue gastos operativos de inversion de capital (ej: una tirada nueva
-- de cajas), para que la inversion no distorsione el resultado mensual. Los
-- gastos existentes quedan como OPERATIVO por el default.
CREATE TYPE "TipoGasto" AS ENUM ('OPERATIVO', 'INVERSION');

ALTER TABLE "gastos" ADD COLUMN "tipo" "TipoGasto" NOT NULL DEFAULT 'OPERATIVO',
ADD COLUMN "unidadesGeneradas" INTEGER,
ADD COLUMN "costoUnitario" DECIMAL(12,2);

CREATE INDEX "gastos_tipo_idx" ON "gastos"("tipo");
