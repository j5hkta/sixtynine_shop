-- =============================================================================
-- Sixty Nine Skate & Apparel Store — Esquema de base de datos
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- =============================================================================

-- `gen_random_uuid()` vive en pgcrypto (ya viene habilitada en Supabase,
-- se deja explícito para entornos self-hosted).
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tabla: productos
-- -----------------------------------------------------------------------------
create table if not exists public.productos (
  id          uuid          primary key default gen_random_uuid(),
  creado_en   timestamptz   not null default now(),
  titulo      text          not null,
  descripcion text,
  precio      numeric(10,2) not null default 0 check (precio >= 0),
  stock       integer       not null default 0 check (stock >= 0),
  categoria   text,
  tallas      text[]        not null default '{}',
  imagenes    text[]        not null default '{}',
  estado      text          not null default 'activo'
                            check (estado in ('activo', 'borrador', 'agotado'))
);

comment on table  public.productos is 'Catálogo de productos de la tienda.';
comment on column public.productos.precio   is 'Precio de venta con 2 decimales.';
comment on column public.productos.tallas   is 'Tallas disponibles, ej: {"S","M","L"} o {"7.5","8.0"}.';
comment on column public.productos.imagenes is 'URLs públicas de las imágenes (Supabase Storage).';
comment on column public.productos.estado   is 'activo | borrador | agotado.';

-- Índices para los listados de la tienda y los filtros del panel admin.
create index if not exists productos_categoria_idx on public.productos (categoria);
create index if not exists productos_estado_idx    on public.productos (estado);
create index if not exists productos_creado_en_idx on public.productos (creado_en desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.productos enable row level security;

-- Lectura pública: cualquier visitante (anon) o usuario autenticado puede
-- listar los productos. Las escrituras quedan bloqueadas por defecto: al no
-- existir políticas de INSERT/UPDATE/DELETE, sólo la `service_role` (que omite
-- RLS) podrá modificar el catálogo desde el panel administrativo.
drop policy if exists "Productos visibles para todos" on public.productos;

create policy "Productos visibles para todos"
  on public.productos
  for select
  to anon, authenticated
  using (true);
