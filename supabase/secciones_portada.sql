-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Secciones de la portada
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/schema.sql`.
--
-- La portada deja de ser "los 8 productos mas recientes" y pasa a tener franjas
-- fijas que se llenan a mano desde el panel. Esta columna dice en cual aparece
-- cada producto.
-- =============================================================================

alter table public.productos
  add column if not exists seccion_portada text not null default 'ninguna';

comment on column public.productos.seccion_portada is
  'Franja de la portada donde aparece el producto: tablas | completos | ropa | proteccion | ninguna.';

-- -----------------------------------------------------------------------------
-- Valores validos
--
-- Aqui SI se pone un CHECK, al reves que con `categoria`. La diferencia es que
-- esto no es una lista que crezca con el catalogo: son las franjas que la
-- portada sabe pintar, y cada una esta escrita a mano en `src/app/(tienda)/
-- page.tsx`. Un valor fuera de esta lista no lo mostraria ninguna seccion, asi
-- que es mejor que la base lo rechace a que el producto desaparezca en silencio.
--
-- Si algun dia se añade una franja, hay que tocar esta restriccion, el tipo de
-- TypeScript y la portada: los tres a la vez, que es justo lo que se quiere.
-- -----------------------------------------------------------------------------
alter table public.productos
  drop constraint if exists productos_seccion_portada_valida;

alter table public.productos
  add constraint productos_seccion_portada_valida
  check (seccion_portada in ('tablas', 'completos', 'ropa', 'proteccion', 'ninguna'));

-- La portada filtra por seccion y por estado en cada revalidacion.
create index if not exists productos_seccion_portada_idx
  on public.productos (seccion_portada, estado);

-- =============================================================================
-- Verificacion
-- =============================================================================
-- select seccion_portada, count(*) from public.productos
--  group by seccion_portada order by 2 desc;
--
-- -- Debe fallar:
-- -- update public.productos set seccion_portada = 'inventada' where true;
--
-- -- Para llenar la portada rapido sin pasar por el panel, por ejemplo:
-- -- update public.productos set seccion_portada = 'tablas'
-- --  where categoria = 'Tablas' and estado = 'activo';
-- =============================================================================
