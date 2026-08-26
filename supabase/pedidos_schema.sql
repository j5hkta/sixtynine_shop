-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Pedidos
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/schema.sql` y `supabase/admin_policies.sql` (es_admin()).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: pedidos
-- -----------------------------------------------------------------------------
create table if not exists public.pedidos (
  id               uuid          primary key default gen_random_uuid(),
  creado_en        timestamptz   not null default now(),
  cliente_nombre   text          not null,
  cliente_telefono text          not null,
  cliente_dni      text          not null,
  direccion_envio  text          not null,
  total            numeric(10,2) not null default 0 check (total >= 0),
  estado           text          not null default 'pendiente'
                                 check (estado in ('pendiente', 'confirmado',
                                                   'enviado', 'entregado',
                                                   'cancelado'))
);

comment on table public.pedidos is
  'Cabecera del pedido. El total lo calcula el servidor, nunca el cliente.';

create index if not exists pedidos_creado_en_idx on public.pedidos (creado_en desc);
create index if not exists pedidos_estado_idx    on public.pedidos (estado);

-- -----------------------------------------------------------------------------
-- Tabla: pedidos_items
--
-- `precio_unitario` es una foto del precio en el momento de la compra: si
-- mañana sube el precio del producto, el pedido histórico no debe cambiar.
--
-- `on delete restrict` sobre producto_id protege ese historial. Efecto
-- secundario a tener en cuenta: un producto que ya se vendió alguna vez no se
-- puede borrar (ver la nota al final del archivo).
-- -----------------------------------------------------------------------------
create table if not exists public.pedidos_items (
  id              uuid          primary key default gen_random_uuid(),
  pedido_id       uuid          not null references public.pedidos (id)   on delete cascade,
  producto_id     uuid          not null references public.productos (id) on delete restrict,
  cantidad        integer       not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  talla           text
);

create index if not exists pedidos_items_pedido_idx   on public.pedidos_items (pedido_id);
create index if not exists pedidos_items_producto_idx on public.pedidos_items (producto_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.pedidos       enable row level security;
alter table public.pedidos_items enable row level security;

drop policy if exists "Cualquiera puede crear un pedido"       on public.pedidos;
drop policy if exists "Solo admins leen pedidos"               on public.pedidos;
drop policy if exists "Solo admins actualizan pedidos"         on public.pedidos;
drop policy if exists "Solo admins eliminan pedidos"           on public.pedidos;
drop policy if exists "Cualquiera puede crear items de pedido" on public.pedidos_items;
drop policy if exists "Solo admins leen items de pedido"       on public.pedidos_items;
drop policy if exists "Solo admins actualizan items de pedido" on public.pedidos_items;
drop policy if exists "Solo admins eliminan items de pedido"   on public.pedidos_items;

-- INSERT abierto: el comprador no tiene cuenta, compra como `anon`.
create policy "Cualquiera puede crear un pedido"
  on public.pedidos
  for insert
  to anon, authenticated
  with check (true);

create policy "Cualquiera puede crear items de pedido"
  on public.pedidos_items
  for insert
  to anon, authenticated
  with check (true);

-- Lectura y gestión: solo administradores. Sin politica de SELECT para `anon`,
-- un comprador no puede leer ni su propio pedido ni el de nadie.
create policy "Solo admins leen pedidos"
  on public.pedidos for select to authenticated using (public.es_admin());

create policy "Solo admins actualizan pedidos"
  on public.pedidos for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "Solo admins eliminan pedidos"
  on public.pedidos for delete to authenticated using (public.es_admin());

create policy "Solo admins leen items de pedido"
  on public.pedidos_items for select to authenticated using (public.es_admin());

create policy "Solo admins actualizan items de pedido"
  on public.pedidos_items for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "Solo admins eliminan items de pedido"
  on public.pedidos_items for delete to authenticated using (public.es_admin());

-- =============================================================================
-- LEER ANTES DE PONER ESTO EN PRODUCCION
-- =============================================================================
--
-- 1. INSERT abierto significa abierto de verdad. `with check (true)` deja que
--    cualquiera llame directamente a la API REST de Supabase con la anon key
--    (que es publica, va en el bundle del navegador) y cree un pedido con el
--    `total` que le de la gana. La validacion de `src/actions/checkout.ts`
--    solo protege a quien pasa por la aplicacion.
--
--    Solucion: mover la creacion a una funcion `security definer`, dejarla
--    como unica via de entrada y quitar estas dos politicas de INSERT:
--
--      create function public.crear_pedido(datos jsonb) returns uuid
--      language plpgsql security definer set search_path = '' as $$ ... $$;
--      revoke insert on public.pedidos, public.pedidos_items from anon;
--
--    Esa funcion ademas resuelve la atomicidad: hoy la cabecera y los items
--    son dos peticiones distintas, y si la segunda falla queda un pedido
--    huerfano sin lineas.
--
-- 2. El stock NO se descuenta. Nada en este esquema ni en la aplicacion resta
--    unidades al confirmar un pedido, asi que la validacion de stock del
--    checkout compara contra un numero que nunca baja. Lo natural es hacerlo
--    dentro de la misma funcion del punto 1, o con un trigger
--    `after insert on public.pedidos_items`.
--
-- 3. `on delete restrict` en producto_id impide borrar un producto que ya
--    aparece en algun pedido: el panel devolvera un error al intentarlo. Es
--    deliberado (borrarlo destruiria el historial), pero lo habitual a futuro
--    es marcarlo como 'borrador' en vez de borrarlo, y guardar una copia del
--    titulo en la linea del pedido.
-- =============================================================================

-- Verificacion:
-- select policyname, cmd, roles from pg_policies
-- where schemaname = 'public' and tablename in ('pedidos', 'pedidos_items')
-- order by tablename, cmd;
