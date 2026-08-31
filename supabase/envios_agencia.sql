-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Envio por agencia y seguimiento
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/envio_schema.sql` (version anterior de procesar_checkout).
--
-- Cambia el modelo de envio: la web ya no cobra flete. El paquete viaja a la
-- agencia (Shalom u Olva) y se paga alli al recogerlo, salvo pedidos grandes
-- que asume la tienda. Como el importe cobrado no cambia entre un caso y otro,
-- `costo_envio` pasa a ser siempre 0 y el total del pedido son los productos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columnas de agencia y seguimiento
-- -----------------------------------------------------------------------------
alter table public.pedidos
  add column if not exists agencia text
    check (agencia is null or agencia in ('shalom', 'olva'));

alter table public.pedidos
  add column if not exists sede_agencia text;

alter table public.pedidos
  add column if not exists tracking_numero text;

alter table public.pedidos
  add column if not exists tracking_clave text;

comment on column public.pedidos.agencia is
  'shalom | olva. Agencia elegida por el comprador.';
comment on column public.pedidos.sede_agencia is
  'Sede o local de la agencia donde recogera el pedido.';
comment on column public.pedidos.tracking_numero is
  'Numero de seguimiento que da la agencia al despachar.';
comment on column public.pedidos.tracking_clave is
  'Clave de recojo. La ve el comprador en /seguimiento con su numero de pedido.';

-- La direccion ahora es solo ciudad/distrito, mucho mas corta que una calle.
comment on column public.pedidos.direccion_envio is
  'Ciudad o distrito de destino. La direccion exacta la pone la agencia.';

-- -----------------------------------------------------------------------------
-- 2. procesar_checkout() sin zonas de envio
--
-- Cambia la firma otra vez, asi que hay que eliminar la anterior: un
-- `create or replace` con distinto numero de parametros dejaria dos funciones
-- vivas y la aplicacion podria acabar llamando a la que ya no vale.
-- -----------------------------------------------------------------------------
drop function if exists public.procesar_checkout(text, text, text, text, jsonb, text);

create or replace function public.procesar_checkout(
  p_cliente_nombre   text,
  p_cliente_telefono text,
  p_cliente_dni      text,
  p_direccion_envio  text,   -- ciudad o distrito
  p_items            jsonb,
  p_agencia          text,   -- 'shalom' | 'olva'
  p_sede_agencia     text
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

  -- Antes se exigian 10 caracteres porque era una direccion completa. Ahora es
  -- solo la ciudad o el distrito, y "Lima" son cuatro letras perfectamente
  -- validas.
  if coalesce(length(btrim(p_direccion_envio)), 0) < 3 then
    raise exception 'Ingresa tu ciudad o distrito.' using detail = 'DATOS_INVALIDOS';
  end if;

  if coalesce(p_agencia, '') not in ('shalom', 'olva') then
    raise exception 'Selecciona una agencia de envío.' using detail = 'ENVIO_INVALIDO';
  end if;

  if coalesce(length(btrim(p_sede_agencia)), 0) < 3 then
    raise exception 'Indica la sede de la agencia donde recogerás el pedido.'
      using detail = 'ENVIO_INVALIDO';
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
    -- lee el stock ya descontado por la primera.
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

    update public.productos
       set stock = stock - v_cantidad
     where id = v_producto_id;
  end loop;

  -- --- Cabecera -------------------------------------------------------------
  -- `costo_envio` = 0: el flete no pasa por la web.
  insert into public.pedidos (
    cliente_nombre, cliente_telefono, cliente_dni, direccion_envio,
    total, costo_envio, agencia, sede_agencia
  )
  values (
    btrim(p_cliente_nombre), p_cliente_telefono, p_cliente_dni,
    btrim(p_direccion_envio),
    v_total, 0, p_agencia, btrim(p_sede_agencia)
  )
  returning id into v_pedido_id;

  -- --- Bucle 2 (INSERT ... SELECT): detalle ---------------------------------
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

comment on function public.procesar_checkout(text, text, text, text, jsonb, text, text) is
  'Crea un pedido de forma atomica: valida stock, lo descuenta y calcula el total. El flete no se cobra en la web.';

revoke all on function public.procesar_checkout(text, text, text, text, jsonb, text, text) from public;
grant execute on function public.procesar_checkout(text, text, text, text, jsonb, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. obtener_resumen_pedido() con datos de seguimiento
--
-- Alimenta la pantalla de confirmacion y el portal /seguimiento. Sigue sin
-- exponer nombre, DNI ni telefono: solo lo que el propio comprador necesita
-- ver, y unicamente si conoce el UUID de su pedido.
-- -----------------------------------------------------------------------------
drop function if exists public.obtener_resumen_pedido(uuid);

create or replace function public.obtener_resumen_pedido(p_id uuid)
returns table (
  total           numeric,
  costo_envio     numeric,
  estado          text,
  creado_en       timestamptz,
  agencia         text,
  sede_agencia    text,
  tracking_numero text,
  tracking_clave  text
)
language sql
security definer
set search_path = public
stable
as $resumen$
  select p.total, p.costo_envio, p.estado, p.creado_en,
         p.agencia, p.sede_agencia, p.tracking_numero, p.tracking_clave
    from public.pedidos p
   where p.id = p_id;
$resumen$;

comment on function public.obtener_resumen_pedido(uuid) is
  'Estado y seguimiento de un pedido. No expone datos personales del cliente.';

revoke all on function public.obtener_resumen_pedido(uuid) from public;
grant execute on function public.obtener_resumen_pedido(uuid) to anon, authenticated;

-- =============================================================================
-- Verificacion
-- =============================================================================
-- -- Una sola funcion procesar_checkout, con 7 argumentos:
-- select p.oid::regprocedure from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname = 'procesar_checkout';
--
-- select * from public.obtener_resumen_pedido('PON-AQUI-UN-UUID');
-- =============================================================================
