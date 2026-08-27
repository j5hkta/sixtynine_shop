-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Checkout atomico y seguro
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/pedidos_schema.sql` (tablas) y `admin_policies.sql`.
--
-- Cierra dos agujeros del flujo anterior:
--   1. `anon` podia insertar en `pedidos` con el total que quisiera llamando
--      directamente a la API REST (la anon key es publica).
--   2. El stock no se descontaba nunca, asi que dos clientes podian comprar
--      la ultima unidad del mismo producto.
--
-- A partir de aqui la UNICA via para crear un pedido es procesar_checkout().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Cerrar la escritura directa
--
-- Se quitan las politicas de INSERT y, ademas, el GRANT a nivel de tabla. Con
-- solo quitar la politica bastaria (RLS deniega por defecto), pero revocar el
-- permiso deja la intencion explicita y protege si alguien reactiva una
-- politica permisiva por error.
-- -----------------------------------------------------------------------------
drop policy if exists "Cualquiera puede crear un pedido"       on public.pedidos;
drop policy if exists "Cualquiera puede crear items de pedido" on public.pedidos_items;

revoke insert on table public.pedidos       from anon, authenticated;
revoke insert on table public.pedidos_items from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. procesar_checkout()
--
-- SECURITY DEFINER: se ejecuta con los privilegios del propietario (postgres),
-- que es dueño de las tablas y por tanto no le aplica RLS. Es lo que permite
-- insertar en `pedidos` y descontar `productos.stock` sin abrir esas tablas a
-- nadie mas.
--
-- Toda funcion PL/pgSQL corre dentro de una transaccion: si cualquier RAISE
-- salta a mitad del bucle, el stock ya descontado y la cabecera ya insertada
-- se deshacen solos. No hay estados a medias.
--
-- `p_items` espera: [{"producto_id": "uuid", "cantidad": 2, "talla": "M"}, ...]
-- -----------------------------------------------------------------------------
create or replace function public.procesar_checkout(
  p_cliente_nombre   text,
  p_cliente_telefono text,
  p_cliente_dni      text,
  p_direccion_envio  text,
  p_items            jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_pedido_id   uuid;
  v_total       numeric(10,2) := 0;
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
  insert into public.pedidos (
    cliente_nombre, cliente_telefono, cliente_dni, direccion_envio, total
  )
  values (
    btrim(p_cliente_nombre), p_cliente_telefono, p_cliente_dni,
    btrim(p_direccion_envio), v_total
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

comment on function public.procesar_checkout(text, text, text, text, jsonb) is
  'Crea un pedido de forma atomica: valida stock, lo descuenta y calcula el total en el servidor. Unica via de entrada para pedidos.';

-- -----------------------------------------------------------------------------
-- 3. Permisos de ejecucion
-- -----------------------------------------------------------------------------
revoke all on function public.procesar_checkout(text, text, text, text, jsonb) from public;
grant execute on function public.procesar_checkout(text, text, text, text, jsonb) to anon, authenticated;

-- =============================================================================
-- Verificacion
-- =============================================================================
-- -- No debe quedar ninguna politica de INSERT:
-- select policyname, cmd, roles from pg_policies
-- where schemaname = 'public' and tablename in ('pedidos','pedidos_items')
-- order by tablename, cmd;
--
-- -- Prueba de humo (sustituye el UUID por uno real de public.productos):
-- select public.procesar_checkout(
--   'Juan Perez', '987654321', '12345678', 'Av. Larco 123, Miraflores, Lima',
--   '[{"producto_id":"PON-AQUI-UN-UUID","cantidad":1,"talla":"M"}]'::jsonb
-- );
--
-- -- Prueba de que el stock bajo:
-- select id, titulo, stock from public.productos where id = 'PON-AQUI-UN-UUID';
--
-- -- Prueba de que el INSERT directo ya NO funciona (debe fallar):
-- set local role anon;
-- insert into public.pedidos (cliente_nombre, cliente_telefono, cliente_dni,
--                             direccion_envio, total)
-- values ('Hacker', '999999999', '00000000', 'Ninguna', 0.01);
-- reset role;
-- =============================================================================
