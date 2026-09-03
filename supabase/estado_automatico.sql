-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Estado automatico del producto
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/inventario_variantes.sql`.
--
-- Se acabo el estado manual. `estado` pasa a ser una columna GENERADA a partir
-- del inventario: en cuanto una compra deja todas las tallas a 0, el producto
-- es 'agotado' en la misma transaccion, sin que nadie tenga que acordarse.
--
-- Desaparece 'borrador'. Ver la nota del apartado 4 sobre que lo sustituye.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Fuera la columna vieja
--
-- CASCADE porque `estado` aparece en el indice `productos_stock_total_idx`
-- (creado por inventario_variantes.sql). Sin el, el DROP falla con
-- "cannot drop column estado because other objects depend on it". El indice se
-- vuelve a crear en el paso 3.
-- -----------------------------------------------------------------------------
alter table public.productos drop column if exists estado cascade;

-- -----------------------------------------------------------------------------
-- 2. La columna generada
--
-- OJO, y es el motivo de que esto no sea la expresion literal del encargo:
-- PostgreSQL NO permite que una columna generada referencie a otra columna
-- generada. `stock_total` ya lo es (inventario_variantes.sql, paso 3), asi que
--
--   generated always as (case when stock_total > 0 then ... end) stored
--
-- falla con:
--   ERROR: cannot use generated column "stock_total" in column generation
--          expression
--
-- La solucion es calcular sobre la columna BASE con la misma funcion inmutable
-- que alimenta a `stock_total`. El resultado es identico —`stock_total` no es
-- mas que esa misma llamada— y ambas columnas se recalculan juntas en cada
-- escritura de `inventario_tallas`, asi que no pueden discrepar.
-- -----------------------------------------------------------------------------
alter table public.productos
  add column estado text
  generated always as (
    case
      when public.total_inventario(inventario_tallas) > 0 then 'activo'
      else 'agotado'
    end
  ) stored;

comment on column public.productos.estado is
  'activo | agotado. GENERADA a partir de inventario_tallas: no se escribe a mano.';

-- -----------------------------------------------------------------------------
-- 3. Indice, recreado tras el CASCADE del paso 1
-- -----------------------------------------------------------------------------
create index if not exists productos_stock_total_idx
  on public.productos (estado, stock_total);

-- -----------------------------------------------------------------------------
-- 4. Que sustituye a 'borrador'
--
-- Antes habia dos formas de sacar un producto de la tienda: ponerlo en
-- 'borrador' o dejarlo sin stock. Ahora solo queda la segunda, y es automatica:
-- un producto con TODAS sus tallas a 0 queda 'agotado' y desaparece del
-- catalogo, de las categorias, del buscador y de la portada, porque las cinco
-- consultas publicas filtran por estado.
--
-- Consecuencia que conviene tener presente: ya no existe el paso intermedio de
-- "preparar un producto sin publicarlo". Un producto recien creado con
-- inventario es visible de inmediato. Si quieres montarlo con calma, crealo con
-- las tallas a 0 y rellenalas cuando este listo.
-- -----------------------------------------------------------------------------

-- =============================================================================
-- Verificacion
-- =============================================================================
-- -- La columna debe salir como ALWAYS (generada):
-- select column_name, is_generated, generation_expression
--   from information_schema.columns
--  where table_schema='public' and table_name='productos'
--    and column_name in ('estado','stock_total');
--
-- -- Escribirla a mano debe fallar:
-- -- update public.productos set estado = 'activo';
-- --   ERROR: column "estado" can only be updated to DEFAULT
--
-- -- Y debe seguir al inventario sola:
-- -- insert into public.productos (titulo, precio, inventario_tallas)
-- -- values ('prueba', 10, '{"M": 2}') returning titulo, stock_total, estado;
-- --   -> 2, activo
-- -- update public.productos set inventario_tallas = '{"M": 0}'
-- --  where titulo = 'prueba' returning stock_total, estado;
-- --   -> 0, agotado
-- -- delete from public.productos where titulo = 'prueba';
-- =============================================================================
