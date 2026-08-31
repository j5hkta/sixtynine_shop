-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Busqueda flexible de pedidos
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/envios_agencia.sql` (columnas de agencia y tracking).
--
-- Por que hace falta una funcion nueva:
--
-- `pedidos` tiene RLS con SELECT restringido a admin, asi que el cliente
-- anonimo no puede consultar la tabla ni con `.ilike('id::text', ...)`. La
-- unica via es una funcion SECURITY DEFINER, igual que `obtener_resumen_pedido`.
-- La diferencia es que esta acepta texto libre (un prefijo) en lugar de exigir
-- un uuid completo.
--
-- Nota de seguridad: aceptar prefijos abre la puerta a enumerar pedidos. Se
-- acota con tres reglas:
--
--   1. Minimo 8 caracteres. Es justo la longitud del codigo corto que ve el
--      comprador (#D8D30EB3) y deja un espacio de 16^8 = 4.294.967.296 valores.
--   2. Si el prefijo casa con mas de un pedido no se devuelve ninguno. Sin
--      esto, un prefijo corto devolveria "algun" pedido ajeno.
--   3. No expone nombre, DNI, telefono ni direccion. Solo importe, estado y
--      datos de recojo, que es lo que el propio comprador necesita ver.
-- =============================================================================

create or replace function public.buscar_pedido_publico(p_termino text)
returns table (
  id              uuid,
  total           numeric,
  costo_envio     numeric,
  estado          text,
  creado_en       timestamptz,
  agencia         text,
  sede_agencia    text,
  tracking_numero text,
  tracking_clave  text
)
language plpgsql
security definer
set search_path = public
stable
as $buscar$
declare
  v_termino text;
begin
  -- Normalizacion: el comprador copia y pega, y arrastra espacios, mayusculas
  -- o el '#' que pintamos delante del codigo corto.
  v_termino := lower(btrim(coalesce(p_termino, '')));
  v_termino := replace(v_termino, ' ', '');
  v_termino := ltrim(v_termino, '#');

  -- Regla 1. El filtro tambien impide que lleguen comodines de LIKE ('%', '_')
  -- al patron de abajo: solo se aceptan digitos hexadecimales y guiones.
  if v_termino !~ '^[0-9a-f-]{8,36}$' then
    return;
  end if;

  -- Regla 2. El LIMIT 2 basta para saber si hay ambiguedad sin recorrer la
  -- tabla entera; la fila solo sale si el prefijo identifica a un unico pedido.
  return query
  with coincidencias as (
    select p.id, p.total, p.costo_envio, p.estado, p.creado_en,
           p.agencia, p.sede_agencia, p.tracking_numero, p.tracking_clave
      from public.pedidos p
     where p.id::text like v_termino || '%'
     limit 2
  )
  select c.*
    from coincidencias c
   where (select count(*) from coincidencias) = 1;
end;
$buscar$;

comment on function public.buscar_pedido_publico(text) is
  'Busca un pedido por uuid completo o por prefijo de al menos 8 caracteres. Devuelve fila unica o ninguna; no expone datos personales.';

revoke all on function public.buscar_pedido_publico(text) from public;
grant execute on function public.buscar_pedido_publico(text) to anon, authenticated;

-- =============================================================================
-- Verificacion
-- =============================================================================
-- -- Con el uuid completo:
-- select * from public.buscar_pedido_publico('PON-AQUI-UN-UUID');
--
-- -- Con el codigo corto tal cual lo ve el comprador (case-insensitive y con #):
-- select * from public.buscar_pedido_publico('#D8D30EB3');
--
-- -- Demasiado corto -> 0 filas:
-- select * from public.buscar_pedido_publico('d8d3');
-- =============================================================================
