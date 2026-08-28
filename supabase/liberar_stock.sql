-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Liberacion de stock retenido
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/seguridad_pedidos.sql` y `supabase/envio_schema.sql`.
--
-- `procesar_checkout()` descuenta el stock al crear el pedido, antes de cobrar.
-- Eso evita la sobreventa, pero deja un cabo suelto: si el comprador nunca
-- paga, esas unidades quedan retenidas para siempre y desaparecen del catalogo
-- sin haberse vendido. Esta funcion las devuelve.
--
-- VENTANA: 24 horas.
-- El cobro es manual (Yape o efectivo) y se coordina por WhatsApp, asi que hay
-- que dar margen para que alguien vea el mensaje, yapee y mande la captura.
-- Con una pasarela de tarjeta bastarian 30 minutos; con una persona al otro
-- lado, no.
-- =============================================================================

create or replace function public.liberar_stock_vencido(
  p_horas integer default 24
)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_liberados integer := 0;
begin
  -- `for update` sobre los pedidos candidatos: si dos ejecuciones del cron se
  -- solapan, la segunda espera y ve los pedidos ya cancelados por la primera,
  -- en vez de devolver el stock dos veces.
  with vencidos as (
    select p.id
      from public.pedidos p
     where p.estado = 'pendiente'
       and p.creado_en < now() - make_interval(hours => p_horas)
     for update
  ),
  -- Se agrupa por producto: un pedido puede traer el mismo articulo en dos
  -- tallas, y hay que devolver la suma, no una de las dos lineas.
  a_devolver as (
    select i.producto_id, sum(i.cantidad) as unidades
      from public.pedidos_items i
      join vencidos v on v.id = i.pedido_id
     group by i.producto_id
  ),
  devolucion as (
    update public.productos pr
       set stock = pr.stock + d.unidades
      from a_devolver d
     where pr.id = d.producto_id
    returning pr.id
  )
  update public.pedidos
     set estado = 'cancelado'
   where id in (select id from vencidos);

  get diagnostics v_liberados = row_count;

  if v_liberados > 0 then
    raise notice 'Liberados % pedidos vencidos (mas de % horas).', v_liberados, p_horas;
  end if;

  return v_liberados;
end;
$fn$;

comment on function public.liberar_stock_vencido(integer) is
  'Cancela los pedidos pendientes con mas de p_horas de antiguedad y devuelve su stock al catalogo.';

-- -----------------------------------------------------------------------------
-- Permisos: nadie la ejecuta desde la aplicacion, solo el cron y un admin.
-- -----------------------------------------------------------------------------
revoke all on function public.liberar_stock_vencido(integer) from public, anon, authenticated;
grant execute on function public.liberar_stock_vencido(integer) to service_role;

-- -----------------------------------------------------------------------------
-- Programacion
--
-- Sin esto la funcion existe pero no la llama nadie. En Supabase:
-- Database > Extensions > habilitar `pg_cron`, y despues:
--
--   select cron.schedule(
--     'liberar-stock-vencido',
--     '0 * * * *',                                   -- cada hora en punto
--     $$select public.liberar_stock_vencido(24)$$
--   );
--
-- Para comprobar que quedo programado:
--   select jobname, schedule, command from cron.job;
-- Para quitarlo:
--   select cron.unschedule('liberar-stock-vencido');
-- -----------------------------------------------------------------------------

-- =============================================================================
-- Verificacion manual
-- =============================================================================
-- -- Pedidos pendientes y su antiguedad:
-- select id, creado_en, now() - creado_en as antiguedad, total
--   from public.pedidos where estado = 'pendiente' order by creado_en;
--
-- -- Simulacion con una ventana de 0 horas (libera TODO lo pendiente):
-- --   select public.liberar_stock_vencido(0);
--
-- -- Ejecucion normal:
-- select public.liberar_stock_vencido(24);
-- =============================================================================
