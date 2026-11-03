-- Crons que llaman al CRM desde Supabase (pg_cron + pg_net) en vez de Vercel,
-- que en el plan Hobby solo permite una corrida por dia. Correr una vez en
-- el SQL Editor de Supabase. Los endpoints son GET y validan
-- "Authorization: Bearer <CRON_SECRET>" (el mismo valor que en Vercel).
--
-- La URL y el secreto quedan en Supabase Vault, no en este archivo: antes de
-- correrlo, reemplazar <CRON_SECRET> y <DOMINIO> en el paso 2 (y no
-- commitear esos valores).
--
-- Ver corridas:   select * from cron.job_run_details order by start_time desc limit 20;
-- Ver respuestas: select id, status_code, left(content, 200), created from net._http_response order by created desc limit 20;
-- Cambiar frecuencia: volver a correr cron.schedule con el mismo nombre.
-- Borrar un job:  select cron.unschedule('entregas-tiendup');

-- 1. Extensiones
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Secretos (una sola vez; para cambiarlos: vault.update_secret)
select vault.create_secret('<CRON_SECRET>', 'crm_cron_secret');
select vault.create_secret('https://<DOMINIO>', 'crm_url');

-- 3. Llamada a un endpoint de cron del CRM
create or replace function public.llamar_cron_crm(ruta text)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'crm_url') || ruta,
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'crm_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
$$;
revoke all on function public.llamar_cron_crm(text) from public, anon, authenticated;

-- 4. Jobs (horas en UTC: Argentina = UTC-3)
-- Estado de envios y entregas segun Tiendup, cada 5 minutos.
select cron.schedule('entregas-tiendup', '*/5 * * * *',
  $$ select public.llamar_cron_crm('/api/cron/entregas-tiendup') $$);
-- Aviso de pedidos sin entregar, una vez por dia a las 8 de Argentina.
select cron.schedule('entregas-tiendup-aviso', '0 11 * * *',
  $$ select public.llamar_cron_crm('/api/cron/entregas-tiendup?avisar=1') $$);
-- /api/cron/envios-correo (seguimiento en MiCorreo) no se programa: la API
-- de tracking no encuentra los envios importados, el estado sale de Tiendup.
-- Si algun dia funciona:
--   select cron.schedule('envios-correo', '30 * * * *',
--     $$ select public.llamar_cron_crm('/api/cron/envios-correo') $$);
