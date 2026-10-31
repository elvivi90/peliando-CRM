-- Categoria propia para la publicidad paga (Meta), separada de Marketing /
-- Produccion para descontarla del margen por unidad. Los gastos de
-- publicidad ya cargados se pasan aparte, con un script: Postgres no deja
-- usar un valor de enum nuevo en la misma transaccion que lo crea.
ALTER TYPE "CategoriaGasto" ADD VALUE 'PUBLICIDAD' BEFORE 'OTROS';
