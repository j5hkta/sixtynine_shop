-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Limite de peticiones por IP
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
--
-- Protege /api/reniec de que alguien agote la cuota de APIsPERU. La validacion
-- de origen que ya tiene ese endpoint corta el uso desde otras webs, pero
-- `Origin` y `Referer` los pone el cliente y se falsifican con una linea de
-- curl. Esto cuenta peticiones reales por IP y no se puede falsificar desde el
-- navegador.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: rate_limits
--
-- `ultima_peticion` NO es "cuando fue la ultima peticion": es cuando empezo la
-- ventana en curso. Ventana fija: al expirar, el contador vuelve a 1 y la
-- marca se mueve. Si se actualizara en cada peticion, la ventana no cerraria
-- nunca mientras siguiera llegando trafico y una IP activa quedaria bloqueada
-- de forma permanente.
-- -----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  ip              text        primary key,
  peticiones      integer     not null default 1,
  ultima_peticion timestamptz not null default now()
);

comment on table public.rate_limits is
  'Contador de peticiones por IP. `ultima_peticion` marca el inicio de la ventana vigente.';

create index if not exists rate_limits_ultima_peticion_idx
  on public.rate_limits (ultima_peticion);

-- RLS sin ninguna politica: nadie puede tocar esta tabla desde la API REST.
-- Solo la `service_role` (que omite RLS) y la funcion de abajo la escriben.
alter table public.rate_limits enable row level security;

revoke all on table public.rate_limits from anon, authenticated;

-- -----------------------------------------------------------------------------
-- verificar_rate_limit()
--
-- Devuelve `true` si la peticion se permite y `false` si excede el limite.
--
-- Todo ocurre en una sola sentencia con `on conflict do update`, que Postgres
-- resuelve tomando el bloqueo de fila: dos peticiones simultaneas de la misma
-- IP se serializan y ninguna se pierde. Contar con un SELECT y luego un UPDATE
-- por separado dejaria pasar rafagas.
-- -----------------------------------------------------------------------------
create or replace function public.verificar_rate_limit(
  p_ip               text,
  p_max              integer,
  p_ventana_segundos integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_peticiones integer;
begin
  if coalesce(btrim(p_ip), '') = '' then
    -- Sin IP no hay a quien contar; se rechaza en vez de dar barra libre.
    return false;
  end if;

  insert into public.rate_limits as r (ip, peticiones, ultima_peticion)
  values (p_ip, 1, now())
  on conflict (ip) do update
    set peticiones =
          case
            when r.ultima_peticion < now() - make_interval(secs => p_ventana_segundos)
              then 1
            else r.peticiones + 1
          end,
        ultima_peticion =
          case
            when r.ultima_peticion < now() - make_interval(secs => p_ventana_segundos)
              then now()
            else r.ultima_peticion
          end
  returning r.peticiones into v_peticiones;

  return v_peticiones <= p_max;
end;
$fn$;

comment on function public.verificar_rate_limit(text, integer, integer) is
  'Cuenta una peticion de p_ip y devuelve false si supera p_max en p_ventana_segundos.';

-- -----------------------------------------------------------------------------
-- Permisos
--
-- Solo la `service_role` puede ejecutarla. Si `anon` pudiera llamarla, se
-- podria inflar el contador de la IP de otro visitante y dejarlo fuera.
-- -----------------------------------------------------------------------------
revoke all on function public.verificar_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.verificar_rate_limit(text, integer, integer) to service_role;

-- -----------------------------------------------------------------------------
-- Limpieza
--
-- La tabla crece con cada IP nueva. Esta funcion borra las ventanas viejas;
-- conviene programarla con pg_cron (Supabase > Database > Cron Jobs):
--   select cron.schedule('limpiar-rate-limits', '0 4 * * *',
--                        $$select public.limpiar_rate_limits(1)$$);
-- -----------------------------------------------------------------------------
create or replace function public.limpiar_rate_limits(p_dias integer default 1)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_borradas integer;
begin
  delete from public.rate_limits
   where ultima_peticion < now() - make_interval(days => p_dias);

  get diagnostics v_borradas = row_count;
  return v_borradas;
end;
$fn$;

revoke all on function public.limpiar_rate_limits(integer) from public, anon, authenticated;
grant execute on function public.limpiar_rate_limits(integer) to service_role;

-- =============================================================================
-- Verificacion (ejecutar en el SQL Editor, que corre como postgres)
-- =============================================================================
-- select public.verificar_rate_limit('1.2.3.4', 3, 60);  -- true  (1 de 3)
-- select public.verificar_rate_limit('1.2.3.4', 3, 60);  -- true  (2 de 3)
-- select public.verificar_rate_limit('1.2.3.4', 3, 60);  -- true  (3 de 3)
-- select public.verificar_rate_limit('1.2.3.4', 3, 60);  -- false (4 > 3)
-- select * from public.rate_limits where ip = '1.2.3.4';
-- delete from public.rate_limits where ip = '1.2.3.4';
-- =============================================================================
