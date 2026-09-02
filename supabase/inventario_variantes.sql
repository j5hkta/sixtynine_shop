-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Inventario por talla (variantes)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/schema.sql`, `supabase/pedidos_schema.sql` y
--          `supabase/envios_agencia.sql`.
--
-- El stock era un contador global y las tallas una lista suelta, asi que nada
-- impedia vender una M cuando lo que quedaba era una L. Este script sustituye
-- ambas columnas por un unico objeto JSONB con las unidades de cada talla.
--
-- DESTRUCTIVO: elimina `productos.stock` y `productos.tallas`. Se comprobo que
-- las tres tablas afectadas (productos, pedidos, pedidos_items) estaban vacias
-- al escribirlo, de modo que no habia inventario que migrar. Si vuelves a
-- ejecutarlo con datos dentro, el paso 5 los descarta: haz copia antes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funciones auxiliares
--
-- IMMUTABLE porque las usan una restriccion CHECK y una columna generada, y
-- Postgres solo admite expresiones inmutables en ambos sitios.
-- -----------------------------------------------------------------------------

-- Un inventario valido es un objeto cuyos valores son enteros no negativos.
-- Sin esto, un `{"M": -3}` o un `{"M": "diez"}` entrarian sin protestar y
-- reventarian mas tarde, al restar, con un error incomprensible.
create or replace function public.inventario_valido(p_inventario jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(coalesce(p_inventario, 'null'::jsonb)) = 'object'
     and not exists (
       select 1
         from jsonb_each(p_inventario) e
        where jsonb_typeof(e.value) <> 'number'
           or (e.value #>> '{}')::numeric < 0
           or (e.value #>> '{}')::numeric <> floor((e.value #>> '{}')::numeric)
     );
$$;

comment on function public.inventario_valido(jsonb) is
  'true si el JSONB es un objeto con enteros no negativos en todos sus valores.';

-- Suma de todas las tallas. Alimenta la columna generada `stock_total`.
create or replace function public.total_inventario(p_inventario jsonb)
returns integer
language sql
immutable
as $$
  select coalesce(
    (select sum((e.value #>> '{}')::int)
       from jsonb_each(coalesce(p_inventario, '{}'::jsonb)) e),
    0
  )::int;
$$;

comment on function public.total_inventario(jsonb) is
  'Unidades totales de un inventario por tallas.';

-- Suma dos inventarios clave a clave. La usa `liberar_stock_vencido()` para
-- devolver a cada talla lo suyo. El `full join` es deliberado: si el admin
-- retiro una talla mientras el pedido estaba pendiente, la clave vuelve a
-- aparecer con las unidades devueltas en lugar de perderse.
create or replace function public.sumar_inventario(p_actual jsonb, p_delta jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (select jsonb_object_agg(clave, to_jsonb(unidades))
       from (
         select coalesce(a.key, d.key) as clave,
                coalesce((a.value #>> '{}')::int, 0)
                  + coalesce((d.value #>> '{}')::int, 0) as unidades
           from jsonb_each(coalesce(p_actual, '{}'::jsonb)) a
           full join jsonb_each(coalesce(p_delta, '{}'::jsonb)) d
             on d.key = a.key
       ) s),
    '{}'::jsonb
  );
$$;

comment on function public.sumar_inventario(jsonb, jsonb) is
  'Suma dos inventarios por talla, conservando las claves de ambos.';

-- -----------------------------------------------------------------------------
-- 2. Nueva columna de inventario
--
-- Para productos sin tallas el estandar es {"Unica": n}. Se usa una clave real
-- y no un objeto vacio para que la ficha, el carrito y el checkout traten a
-- todos los productos igual y no haya dos caminos que mantener.
-- -----------------------------------------------------------------------------
alter table public.productos
  add column if not exists inventario_tallas jsonb not null default '{}'::jsonb;

comment on column public.productos.inventario_tallas is
  'Unidades por talla: {"S": 10, "M": 4}. Productos sin tallas usan {"Unica": n}.';

alter table public.productos
  drop constraint if exists productos_inventario_valido;

alter table public.productos
  add constraint productos_inventario_valido
  check (public.inventario_valido(inventario_tallas));

-- -----------------------------------------------------------------------------
-- 3. stock_total: columna generada
--
-- La tienda filtra por "tiene existencias" en cinco consultas distintas.
-- Calcularlo sobre el JSONB en cada una seria lento y facil de escribir mal;
-- una columna generada lo mantiene siempre coherente, se puede indexar, y las
-- consultas siguen siendo un `.gt("stock_total", 0)` de una linea.
--
-- STORED y no VIRTUAL: se lee mucho mas de lo que se escribe.
-- -----------------------------------------------------------------------------
alter table public.productos
  drop column if exists stock_total;

alter table public.productos
  add column stock_total integer
  generated always as (public.total_inventario(inventario_tallas)) stored;

comment on column public.productos.stock_total is
  'Suma de inventario_tallas. Generada: no se escribe a mano.';

create index if not exists productos_stock_total_idx
  on public.productos (estado, stock_total);

-- -----------------------------------------------------------------------------
-- 4. pedidos_items.talla_seleccionada
--
-- La columna `talla` ya guardaba exactamente esto, asi que se RENOMBRA en vez
-- de crear una nueva al lado: dos columnas para el mismo dato acabarian
-- discrepando. El `do` la hace re-ejecutable.
-- -----------------------------------------------------------------------------
do $renombrar$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'pedidos_items'
       and column_name = 'talla'
  ) and not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'pedidos_items'
       and column_name = 'talla_seleccionada'
  ) then
    alter table public.pedidos_items rename column talla to talla_seleccionada;
  end if;
end;
$renombrar$;

alter table public.pedidos_items
  add column if not exists talla_seleccionada text;

comment on column public.pedidos_items.talla_seleccionada is
  'Variante exacta comprada. Coincide con una clave de productos.inventario_tallas.';

-- -----------------------------------------------------------------------------
-- 5. Fuera las columnas viejas
--
-- Despues de crear lo nuevo, para que el script pueda interrumpirse a medias
-- sin dejar la tabla sin ninguna forma de saber si hay existencias.
-- -----------------------------------------------------------------------------
alter table public.productos drop column if exists stock;
alter table public.productos drop column if exists tallas;

-- -----------------------------------------------------------------------------
-- 6. procesar_checkout() por talla
--
-- El cambio de fondo esta en el bucle: se bloquea la fila del producto, se mira
-- la talla concreta y se descuenta SOLO de esa clave. El `for update` sigue
-- siendo lo que impide la sobreventa —el tipo de la columna es indiferente—:
-- dos compras simultaneas del mismo producto se serializan, y la segunda lee el
-- inventario ya descontado por la primera.
-- -----------------------------------------------------------------------------
drop function if exists public.procesar_checkout(text, text, text, text, jsonb, text, text);

create or replace function public.procesar_checkout(
  p_cliente_nombre   text,
  p_cliente_telefono text,
  p_cliente_dni      text,
  p_direccion_envio  text,
  p_items            jsonb,
  p_agencia          text,
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
  v_talla       text;
  v_precio      numeric(10,2);
  v_inventario  jsonb;
  v_disponible  integer;
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

  -- --- Bucle: bloquear, validar la talla, descontar y acumular --------------
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad    := (v_item ->> 'cantidad')::integer;

    -- Un producto sin tallas llega con talla nula: se normaliza a la clave
    -- estandar para que el resto del bucle no tenga que distinguir dos casos.
    v_talla := coalesce(nullif(btrim(coalesce(v_item ->> 'talla', '')), ''), 'Unica');

    if v_producto_id is null or v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Hay una línea inválida en el carrito.' using detail = 'ITEM_INVALIDO';
    end if;

    select p.precio, p.estado, p.titulo, p.inventario_tallas
      into v_precio, v_estado, v_titulo, v_inventario
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

    if not (v_inventario ? v_talla) then
      raise exception 'La talla % de "%" ya no está disponible.', v_talla, v_titulo
        using detail = 'TALLA_NO_DISPONIBLE';
    end if;

    v_disponible := (v_inventario ->> v_talla)::integer;

    if v_disponible < v_cantidad then
      raise exception 'Solo quedan % unidades de "%" en talla % y pediste %.',
        v_disponible, v_titulo, v_talla, v_cantidad using detail = 'STOCK_INSUFICIENTE';
    end if;

    v_total := v_total + (v_precio * v_cantidad);

    -- Se descuenta SOLO de esa clave. `jsonb_set` con la ruta de un elemento
    -- deja el resto del objeto intacto.
    update public.productos
       set inventario_tallas =
             jsonb_set(inventario_tallas, array[v_talla],
                       to_jsonb(v_disponible - v_cantidad))
     where id = v_producto_id;
  end loop;

  -- --- Cabecera -------------------------------------------------------------
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

  -- --- Detalle --------------------------------------------------------------
  -- Se guarda la talla YA NORMALIZADA, la misma que se descontó arriba: si
  -- aquí quedara el nulo original, `liberar_stock_vencido()` no sabría a qué
  -- clave devolver las unidades de un producto sin tallas.
  insert into public.pedidos_items (
    pedido_id, producto_id, cantidad, precio_unitario, talla_seleccionada
  )
  select v_pedido_id,
         (i ->> 'producto_id')::uuid,
         (i ->> 'cantidad')::integer,
         p.precio,
         coalesce(nullif(btrim(coalesce(i ->> 'talla', '')), ''), 'Unica')
    from jsonb_array_elements(p_items) as i
    join public.productos p on p.id = (i ->> 'producto_id')::uuid;

  return v_pedido_id;
end;
$fn$;

comment on function public.procesar_checkout(text, text, text, text, jsonb, text, text) is
  'Crea un pedido de forma atomica: valida y descuenta el inventario de la talla concreta y calcula el total.';

revoke all on function public.procesar_checkout(text, text, text, text, jsonb, text, text) from public;
grant execute on function public.procesar_checkout(text, text, text, text, jsonb, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. liberar_stock_vencido() por talla
--
-- No estaba en el encargo, pero sin esto la migracion queda a medias: la
-- funcion seguia sumando a `productos.stock`, columna que el paso 5 acaba de
-- eliminar. Habria fallado en la primera ejecucion del cron, en silencio, y las
-- unidades de los pedidos no pagados no volverian nunca al catalogo.
-- -----------------------------------------------------------------------------
create or replace function public.liberar_stock_vencido(
  p_horas integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_liberados integer := 0;
begin
  with vencidos as (
    select p.id
      from public.pedidos p
     where p.estado = 'pendiente'
       and p.creado_en < now() - make_interval(hours => p_horas)
     for update
  ),
  -- Primero por producto Y talla: un pedido puede traer el mismo articulo en
  -- dos tallas y cada una vuelve a su propia clave.
  por_talla as (
    select i.producto_id,
           coalesce(nullif(btrim(i.talla_seleccionada), ''), 'Unica') as talla,
           sum(i.cantidad)::int as unidades
      from public.pedidos_items i
      join vencidos v on v.id = i.pedido_id
     group by 1, 2
  ),
  -- Y despues se arma un inventario-delta por producto.
  delta as (
    select producto_id, jsonb_object_agg(talla, unidades) as cambios
      from por_talla
     group by producto_id
  ),
  devolucion as (
    update public.productos pr
       set inventario_tallas = public.sumar_inventario(pr.inventario_tallas, d.cambios)
      from delta d
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

revoke all on function public.liberar_stock_vencido(integer) from public, anon, authenticated;
grant execute on function public.liberar_stock_vencido(integer) to service_role;

-- =============================================================================
-- Verificacion
-- =============================================================================
-- -- Columnas nuevas y viejas:
-- select column_name, data_type, is_generated
--   from information_schema.columns
--  where table_schema='public' and table_name='productos'
--    and column_name in ('stock','tallas','inventario_tallas','stock_total');
-- -- Debe devolver SOLO inventario_tallas y stock_total (esta ultima ALWAYS).
--
-- -- Las funciones auxiliares:
-- select public.total_inventario('{"S":3,"M":2}'::jsonb);          -- 5
-- select public.inventario_valido('{"S":-1}'::jsonb);              -- false
-- select public.inventario_valido('{"S":"x"}'::jsonb);             -- false
-- select public.sumar_inventario('{"S":1}'::jsonb,'{"M":2}'::jsonb); -- {"S":1,"M":2}
--
-- -- La restriccion rechaza inventarios imposibles:
-- -- insert into public.productos (titulo, precio, inventario_tallas)
-- -- values ('prueba', 10, '{"M": -1}');   -- debe fallar
-- =============================================================================
