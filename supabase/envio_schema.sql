-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Costo de envio en el checkout
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/seguridad_pedidos.sql` (crea procesar_checkout).
--
-- El total del pedido lo calcula `procesar_checkout()` dentro de Postgres, no
-- la aplicacion. Por eso el envio tiene que entrar ahi: sumarlo desde Next.js
-- seria imposible sin reabrir el UPDATE sobre `pedidos`, que es justo lo que
-- cerramos por seguridad.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columnas de envio
--
-- Se guardan por separado del total para que el panel pueda desglosar cuanto
-- fue producto y cuanto fue envio. Sin esto, `pedidos.total` seria un numero
-- que no cuadra con la suma de `pedidos_items` y nadie sabria por que.
-- -----------------------------------------------------------------------------
alter table public.pedidos
  add column if not exists costo_envio numeric(10,2) not null default 0
    check (costo_envio >= 0);

alter table public.pedidos
  add column if not exists zona_envio text
    check (zona_envio is null or zona_envio in ('lima', 'provincia'));

comment on column public.pedidos.costo_envio is
  'Costo de envio cobrado, ya incluido dentro de `total`.';

-- -----------------------------------------------------------------------------
-- 2. procesar_checkout() con zona de envio
--
-- La firma cambia, asi que hay que eliminar la version anterior: un
-- `create or replace` con distinto numero de parametros crearia una sobrecarga
-- y quedarian dos funciones vivas, una de ellas sin cobrar el envio.
--
-- Se recibe la ZONA, no el costo. Si el cliente mandara el importe podria
-- pedir un envio de S/ 0.00; mandando solo 'lima' o 'provincia', el precio lo
-- decide el servidor. (El mismo importe esta en `src/lib/envio.ts`, que solo
-- lo usa para mostrarlo; el que se cobra es este.)
-- -----------------------------------------------------------------------------
drop function if exists public.procesar_checkout(text, text, text, text, jsonb);

create or replace function public.procesar_checkout(
  p_cliente_nombre   text,
  p_cliente_telefono text,
  p_cliente_dni      text,
  p_direccion_envio  text,
  p_items            jsonb,
  p_zona_envio       text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_pedido_id   uuid;
  v_total       numeric(10,2) := 0;
  v_envio       numeric(10,2);
  v_item        jsonb;
  v_producto_id uuid;
  v_cantidad    integer;
  v_precio      numeric(10,2);
  v_stock       integer;
  v_estado      text;
  v_titulo      text;
begin
  -- --- Validacion de entrada ------------------------------------------------
  if coalesce(length(btrim(p_cliente_nombre)), 0) < 3 then
    raise exception 'Ingresa tu nombre completo.' using detail = 'DATOS_INVALIDOS';
  end if;

  if coalesce(p_cliente_dni, '') !~ '^\d{8}$' then
    raise exception 'El DNI debe tener exactamente 8 dígitos.' using detail = 'DATOS_INVALIDOS';
  end if;

  if coalesce(p_cliente_telefono, '') !~ '^9\d{8}$' then
    raise exception 'El teléfono debe ser un celular peruano de 9 dígitos.' using detail = 'DATOS_INVALIDOS';
  end if;

  if coalesce(length(btrim(p_direccion_envio)), 0) < 10 then
    raise exception 'Ingresa una dirección de envío completa.' using detail = 'DATOS_INVALIDOS';
  end if;

  -- El costo lo fija el servidor a partir de la zona.
  v_envio := case coalesce(p_zona_envio, '')
               when 'lima'      then 10.00
               when 'provincia' then 20.00
               else null
             end;

  if v_envio is null then
    raise exception 'Selecciona una zona de envío válida.' using detail = 'ENVIO_INVALIDO';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Tu carrito está vacío.' using detail = 'CARRITO_VACIO';
  end if;

  -- --- Bucle 1: bloquear, validar, descontar y acumular ---------------------
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad    := (v_item ->> 'cantidad')::integer;

    if v_producto_id is null or v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Hay una línea inválida en el carrito.' using detail = 'ITEM_INVALIDO';
    end if;

    -- FOR UPDATE bloquea la fila hasta el final de la transaccion: si dos
    -- compras coinciden sobre el mismo producto, la segunda espera aqui y
    -- lee el stock ya descontado por la primera. Sin esto, ambas leerian el
    -- mismo valor y venderian la misma unidad dos veces.
    select p.precio, p.stock, p.estado, p.titulo
      into v_precio, v_stock, v_estado, v_titulo
      from public.productos p
     where p.id = v_producto_id
     for update;

    if not found then
      raise exception 'Uno de los productos ya no existe. Revisa tu carrito.'
        using detail = 'PRODUCTO_NO_DISPONIBLE';
    end if;

    if v_estado = 'borrador' then
      raise exception 'Uno de los productos ya no está disponible. Revisa tu carrito.'
        using detail = 'PRODUCTO_NO_DISPONIBLE';
    end if;

    if v_estado = 'agotado' then
      raise exception '"%" está agotado.', v_titulo using detail = 'PRODUCTO_NO_DISPONIBLE';
    end if;

    if v_stock < v_cantidad then
      raise exception 'Solo quedan % unidades de "%" y pediste %.',
        v_stock, v_titulo, v_cantidad using detail = 'STOCK_INSUFICIENTE';
    end if;

    v_total := v_total + (v_precio * v_cantidad);

    -- Se descuenta dentro del bucle. Efecto util: si el mismo producto viene
    -- en dos tallas, la segunda vuelta ya lee el stock reducido por la
    -- primera, asi que 3 + 4 unidades contra un stock de 5 falla como debe.
    update public.productos
       set stock = stock - v_cantidad
     where id = v_producto_id;
  end loop;

  -- --- Cabecera -------------------------------------------------------------
  -- `total` incluye el envio; `costo_envio` guarda cuanto de ese total lo fue.
  insert into public.pedidos (
    cliente_nombre, cliente_telefono, cliente_dni, direccion_envio,
    total, costo_envio, zona_envio
  )
  values (
    btrim(p_cliente_nombre), p_cliente_telefono, p_cliente_dni,
    btrim(p_direccion_envio),
    v_total + v_envio, v_envio, p_zona_envio
  )
  returning id into v_pedido_id;

  -- --- Bucle 2 (INSERT ... SELECT): detalle ---------------------------------
  -- `p.precio` se relee de la tabla, pero las filas siguen bloqueadas por el
  -- FOR UPDATE de arriba: es exactamente el mismo precio con el que se calculo
  -- v_total. Nadie puede haberlo cambiado en medio.
  insert into public.pedidos_items (
    pedido_id, producto_id, cantidad, precio_unitario, talla
  )
  select v_pedido_id,
         (i ->> 'producto_id')::uuid,
         (i ->> 'cantidad')::integer,
         p.precio,
         nullif(btrim(coalesce(i ->> 'talla', '')), '')
    from jsonb_array_elements(p_items) as i
    join public.productos p on p.id = (i ->> 'producto_id')::uuid;

  return v_pedido_id;
end;
$fn$;

comment on function public.procesar_checkout(text, text, text, text, jsonb, text) is
  'Crea un pedido de forma atomica: valida stock, lo descuenta, calcula el total con los precios reales y suma el envio segun la zona.';

-- -----------------------------------------------------------------------------
-- 3. Permisos de ejecucion (la firma nueva necesita su propio GRANT)
-- -----------------------------------------------------------------------------
revoke all on function public.procesar_checkout(text, text, text, text, jsonb, text) from public;
grant execute on function public.procesar_checkout(text, text, text, text, jsonb, text) to anon, authenticated;

-- =============================================================================
-- Verificacion
-- =============================================================================
-- -- Debe aparecer UNA sola funcion, con 6 argumentos:
-- select p.oid::regprocedure as firma
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname = 'procesar_checkout';
--
-- -- Prueba (sustituye el UUID por uno real de public.productos):
-- select public.procesar_checkout(
--   'Juan Perez', '987654321', '12345678', 'Av. Larco 123, Miraflores, Lima',
--   '[{"producto_id":"PON-AQUI-UN-UUID","cantidad":1,"talla":"M"}]'::jsonb,
--   'provincia'
-- );
--
-- -- El total debe ser (precio * cantidad) + 20:
-- select total, costo_envio, zona_envio from public.pedidos
-- order by creado_en desc limit 1;
--
-- -- Una zona inventada debe fallar:
-- select public.procesar_checkout('Juan Perez','987654321','12345678',
--   'Av. Larco 123, Miraflores, Lima', '[]'::jsonb, 'gratis');
-- =============================================================================
