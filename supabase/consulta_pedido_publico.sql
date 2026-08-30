-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Consulta publica de un pedido
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/pedidos_schema.sql` y `supabase/envio_schema.sql`.
--
-- La pantalla de confirmacion (/checkout/exito) tiene que mostrarle al
-- comprador cuanto debe yapear, pero `pedidos` solo es legible por admins y el
-- comprador no tiene cuenta. Esta funcion es la unica rendija: devuelve el
-- importe y el estado, y nada mas.
--
-- Lo que NO devuelve, a proposito: nombre, DNI, telefono ni direccion. Aunque
-- alguien acertara un UUID (122 bits de entropia), solo veria una cifra.
-- =============================================================================

create or replace function public.obtener_resumen_pedido(p_id uuid)
returns table (total numeric, costo_envio numeric, estado text)
language sql
security definer
set search_path = public
stable
as $fn$
  select p.total, p.costo_envio, p.estado
    from public.pedidos p
   where p.id = p_id;
$fn$;

comment on function public.obtener_resumen_pedido(uuid) is
  'Importe y estado de un pedido para la pantalla de confirmacion. No expone datos del cliente.';

-- -----------------------------------------------------------------------------
-- Permisos: el comprador llega sin sesion, asi que `anon` debe poder ejecutarla.
-- -----------------------------------------------------------------------------
revoke all on function public.obtener_resumen_pedido(uuid) from public;
grant execute on function public.obtener_resumen_pedido(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- obtener_items_pedido()
--
-- La pantalla de confirmacion reparte el cobro entre dos vendedores segun la
-- categoria de cada articulo, asi que necesita las lineas del pedido. Igual
-- que la funcion de arriba: solo producto, categoria, cantidad y precio.
-- Ningun dato del comprador.
-- -----------------------------------------------------------------------------
create or replace function public.obtener_items_pedido(p_id uuid)
returns table (
  titulo          text,
  categoria       text,
  cantidad        integer,
  precio_unitario numeric
)
language sql
security definer
set search_path = public
stable
as $items$
  select pr.titulo, pr.categoria, i.cantidad, i.precio_unitario
    from public.pedidos_items i
    join public.productos pr on pr.id = i.producto_id
   where i.pedido_id = p_id
   order by pr.titulo;
$items$;

comment on function public.obtener_items_pedido(uuid) is
  'Lineas de un pedido para repartir el cobro entre vendedores. No expone datos del cliente.';

revoke all on function public.obtener_items_pedido(uuid) from public;
grant execute on function public.obtener_items_pedido(uuid) to anon, authenticated;

-- =============================================================================
-- Verificacion
-- =============================================================================
-- select * from public.obtener_resumen_pedido('PON-AQUI-UN-UUID-DE-PEDIDO');
--
-- -- Un id inexistente devuelve cero filas, no un error:
-- select * from public.obtener_resumen_pedido('00000000-0000-4000-8000-000000000000');
-- =============================================================================
