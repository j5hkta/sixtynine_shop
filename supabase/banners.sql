-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Banners de portada
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/admin_policies.sql` (define public.es_admin())
--          y `supabase/apariencia_schema.sql` (para migrar el banner actual).
--
-- Sustituye al banner unico de `configuracion_tienda` por una lista ordenable
-- que la portada pinta como carrusel. La tabla antigua NO se borra: el paso 4
-- copia su banner aqui para que la portada no se quede en blanco al desplegar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla
-- -----------------------------------------------------------------------------
create table if not exists public.banners (
  id         uuid primary key default gen_random_uuid(),
  imagen_url text        not null,
  categoria  text        not null default 'Todo',
  orden      integer     not null default 0,
  activo     boolean     not null default true,
  creado_en  timestamptz not null default now()
);

comment on table public.banners is
  'Banners de la portada. Se muestran los activos, ordenados por `orden`.';
comment on column public.banners.categoria is
  'Destino del banner: "Todo" (todo el catalogo) o el nombre exacto de una '
  'categoria de src/lib/categorias.ts, p.ej. "Tablas".';
comment on column public.banners.orden is
  'Menor primero. Admite repetidos; el desempate lo pone `creado_en`.';

-- Sin CHECK sobre `categoria` a proposito. La lista viva esta en
-- `src/lib/categorias.ts` y la valida la Server Action antes de insertar;
-- duplicarla aqui obligaria a una migracion cada vez que se añade una
-- categoria, y es justo el tipo de lista doble que acaba desincronizada.
-- `productos.categoria` sigue el mismo criterio.

-- La portada filtra por `activo` y ordena por `orden` en cada revalidacion.
create index if not exists banners_activo_orden_idx
  on public.banners (activo, orden, creado_en);

-- -----------------------------------------------------------------------------
-- 2. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.banners enable row level security;

drop policy if exists "Banners activos visibles para todos" on public.banners;
drop policy if exists "Admins ven todos los banners"        on public.banners;
drop policy if exists "Solo admins crean banners"           on public.banners;
drop policy if exists "Solo admins actualizan banners"      on public.banners;
drop policy if exists "Solo admins eliminan banners"        on public.banners;

-- Lectura publica, pero SOLO de los activos: un banner desactivado es material
-- que aun no debe verse (una promocion sin lanzar, por ejemplo), y su URL de
-- Storage es publica en cuanto se conoce.
create policy "Banners activos visibles para todos"
  on public.banners
  for select
  to anon, authenticated
  using (activo);

-- Las politicas permisivas se combinan con OR, asi que esta le añade al admin
-- los inactivos sin quitarle los activos que ya ve por la de arriba. El panel
-- necesita listarlos todos para poder reactivarlos.
create policy "Admins ven todos los banners"
  on public.banners
  for select
  to authenticated
  using (public.es_admin());

create policy "Solo admins crean banners"
  on public.banners
  for insert
  to authenticated
  with check (public.es_admin());

create policy "Solo admins actualizan banners"
  on public.banners
  for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "Solo admins eliminan banners"
  on public.banners
  for delete
  to authenticated
  using (public.es_admin());

-- -----------------------------------------------------------------------------
-- 3. Migracion del banner unico
--
-- Copia el banner que hoy vive en `configuracion_tienda` como primer banner de
-- la lista, para que la portada siga mostrando lo mismo tras el despliegue.
--
-- El `where not exists` hace el script re-ejecutable: si ya se migro, no se
-- duplica. La categoria queda en 'Todo' porque el modelo viejo guardaba una
-- ruta libre (`banner_link`) y no una categoria; si aquel enlace apuntaba a una
-- categoria concreta, ajustala desde el panel.
-- -----------------------------------------------------------------------------
insert into public.banners (imagen_url, categoria, orden, activo)
select c.banner_imagen, 'Todo', 0, true
  from public.configuracion_tienda c
 where c.id = 1
   and c.banner_imagen is not null
   and not exists (select 1 from public.banners);

-- =============================================================================
-- Verificacion
-- =============================================================================
-- select id, categoria, orden, activo, imagen_url from public.banners
--  order by orden, creado_en;
--
-- select policyname, cmd, roles from pg_policies
--  where schemaname = 'public' and tablename = 'banners' order by cmd;
--
-- -- Como anonimo (desde la app, no desde el SQL Editor) solo deben salir los
-- -- activos.
-- =============================================================================
