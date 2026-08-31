-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Descuentos y barra de anuncios
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/schema.sql` y `supabase/admin_policies.sql` (es_admin()).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. productos.precio_original
--
-- Precio tachado: lo que costaba ANTES de la rebaja. `precio` sigue siendo el
-- que se cobra, y es el unico que lee `procesar_checkout`, asi que esta columna
-- no toca el importe de ningun pedido: es puramente presentacion.
--
-- Nullable a proposito: la mayoria de productos no estan rebajados, y null
-- distingue "sin descuento" de "descuento del 0%".
-- -----------------------------------------------------------------------------
alter table public.productos
  add column if not exists precio_original numeric(10,2);

comment on column public.productos.precio_original is
  'Precio antes del descuento, solo para mostrarlo tachado. Null = sin descuento. El cobro siempre usa `precio`.';

-- Un precio_original por debajo del precio actual seria un "descuento"
-- negativo. La aplicacion tambien lo valida, pero aqui queda cerrado tambien
-- para ediciones hechas a mano desde el dashboard de Supabase.
alter table public.productos
  drop constraint if exists productos_precio_original_coherente;

alter table public.productos
  add constraint productos_precio_original_coherente
  check (precio_original is null or precio_original > precio);

-- -----------------------------------------------------------------------------
-- 2. Tabla: anuncios
--
-- Frases cortas de la barra superior. Misma forma que `banners` (orden +
-- activo) para que el panel las gestione igual.
-- -----------------------------------------------------------------------------
create table if not exists public.anuncios (
  id          uuid primary key default gen_random_uuid(),
  texto       text        not null,
  url_destino text,
  orden       integer     not null default 0,
  activo      boolean     not null default true,
  creado_en   timestamptz not null default now()
);

comment on table public.anuncios is
  'Mensajes de la barra superior de la tienda. Rotan cada pocos segundos.';
comment on column public.anuncios.url_destino is
  'Ruta interna opcional (debe empezar por /). Null = el anuncio no es un enlace.';
comment on column public.anuncios.orden is
  'Menor primero. Admite repetidos; el desempate lo pone `creado_en`.';

-- Solo rutas internas. Sin esto, quien entre al panel podria convertir la
-- barra que corona TODAS las paginas en un enlace a un dominio ajeno.
-- La Server Action valida lo mismo; esto cubre las ediciones a mano.
alter table public.anuncios
  drop constraint if exists anuncios_url_interna;

alter table public.anuncios
  add constraint anuncios_url_interna
  check (
    url_destino is null
    or (url_destino like '/%' and url_destino not like '//%')
  );

create index if not exists anuncios_activo_orden_idx
  on public.anuncios (activo, orden, creado_en);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security
--
-- Mismo criterio que `banners`: el publico solo ve los activos, el admin ve
-- todo. Las politicas permisivas se combinan con OR.
-- -----------------------------------------------------------------------------
alter table public.anuncios enable row level security;

drop policy if exists "Anuncios activos visibles para todos" on public.anuncios;
drop policy if exists "Admins ven todos los anuncios"        on public.anuncios;
drop policy if exists "Solo admins crean anuncios"           on public.anuncios;
drop policy if exists "Solo admins actualizan anuncios"      on public.anuncios;
drop policy if exists "Solo admins eliminan anuncios"        on public.anuncios;

create policy "Anuncios activos visibles para todos"
  on public.anuncios
  for select
  to anon, authenticated
  using (activo);

create policy "Admins ven todos los anuncios"
  on public.anuncios
  for select
  to authenticated
  using (public.es_admin());

create policy "Solo admins crean anuncios"
  on public.anuncios
  for insert
  to authenticated
  with check (public.es_admin());

create policy "Solo admins actualizan anuncios"
  on public.anuncios
  for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "Solo admins eliminan anuncios"
  on public.anuncios
  for delete
  to authenticated
  using (public.es_admin());

-- =============================================================================
-- Verificacion
-- =============================================================================
-- select id, titulo, precio, precio_original from public.productos
--  where precio_original is not null;
--
-- -- Debe fallar (precio_original por debajo del precio):
-- -- update public.productos set precio_original = 1 where precio > 1;
--
-- select id, texto, url_destino, orden, activo from public.anuncios
--  order by orden, creado_en;
--
-- select policyname, cmd, roles from pg_policies
--  where schemaname = 'public' and tablename = 'anuncios' order by cmd;
-- =============================================================================
