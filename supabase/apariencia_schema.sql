-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Apariencia de la tienda
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/admin_policies.sql` (define public.es_admin()).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: configuracion_tienda
--
-- Tabla de una sola fila (id = 1). El CHECK sobre el id lo garantiza: no hace
-- falta preocuparse por "cual de las filas es la buena" ni por que alguien
-- inserte una segunda por error.
-- -----------------------------------------------------------------------------
create table if not exists public.configuracion_tienda (
  id             integer primary key check (id = 1),
  banner_imagen  text,
  banner_link    text
);

comment on table public.configuracion_tienda is
  'Ajustes visuales de la tienda. Siempre una unica fila con id = 1.';

-- Fila por defecto. `on conflict do nothing` hace el script re-ejecutable sin
-- pisar la configuracion que ya tengas puesta.
insert into public.configuracion_tienda (id, banner_link)
values (1, '/productos')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.configuracion_tienda enable row level security;

drop policy if exists "Configuracion visible para todos"      on public.configuracion_tienda;
drop policy if exists "Solo admins editan la configuracion"   on public.configuracion_tienda;

-- Lectura abierta: la portada la pinta un visitante sin sesion.
create policy "Configuracion visible para todos"
  on public.configuracion_tienda
  for select
  to anon, authenticated
  using (true);

-- Escritura solo para administradores.
create policy "Solo admins editan la configuracion"
  on public.configuracion_tienda
  for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Sin politicas de INSERT ni DELETE a proposito: la fila la crea este script y
-- no debe borrarse ni duplicarse desde la aplicacion.

-- -----------------------------------------------------------------------------
-- Verificacion
-- -----------------------------------------------------------------------------
-- select * from public.configuracion_tienda;
--
-- select policyname, cmd, roles from pg_policies
-- where schemaname = 'public' and tablename = 'configuracion_tienda';
