-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Politicas de escritura para el panel
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/schema.sql` y `supabase/roles_schema.sql`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: es_admin()
--
-- Se encapsula la comprobacion del rol en una funcion en lugar de repetir el
-- EXISTS en cada politica por tres motivos:
--   1. SECURITY DEFINER omite RLS sobre `perfiles`, evitando dependencias
--      circulares entre politicas si mas adelante se endurece esa tabla.
--   2. STABLE permite a Postgres evaluarla una sola vez por consulta en lugar
--      de una vez por fila.
--   3. Un unico punto que cambiar cuando aparezcan mas roles.
-- -----------------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = (select auth.uid())
      and p.rol = 'admin'
  );
$$;

comment on function public.es_admin() is
  'true si el usuario de la sesion actual tiene rol admin en public.perfiles.';

-- Solo las sesiones autenticadas necesitan ejecutarla.
revoke execute on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- Politicas de escritura sobre `productos`
--
-- La politica de lectura "Productos visibles para todos" (en schema.sql) sigue
-- vigente: la tienda publica necesita leer el catalogo sin sesion. Lo que se
-- añade aqui es exclusivamente escritura, y solo para administradores.
-- -----------------------------------------------------------------------------
drop policy if exists "Solo admins crean productos"      on public.productos;
drop policy if exists "Solo admins actualizan productos" on public.productos;
drop policy if exists "Solo admins eliminan productos"   on public.productos;

-- INSERT: `with check` valida la fila que se intenta escribir.
create policy "Solo admins crean productos"
  on public.productos
  for insert
  to authenticated
  with check (public.es_admin());

-- UPDATE: `using` decide que filas son visibles para actualizar y
-- `with check` valida el resultado. Hacen falta las dos: sin `with check`,
-- un admin degradado a mitad de transaccion podria dejar la fila escrita.
create policy "Solo admins actualizan productos"
  on public.productos
  for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- DELETE: solo `using`.
create policy "Solo admins eliminan productos"
  on public.productos
  for delete
  to authenticated
  using (public.es_admin());

-- -----------------------------------------------------------------------------
-- Verificacion
-- -----------------------------------------------------------------------------
-- select policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public' and tablename = 'productos'
-- order by cmd;
--
-- Comprobar el rol de la sesion actual desde el SQL Editor no sirve
-- (ahi se ejecuta como postgres). Pruebalo desde la app: con una cuenta
-- 'cliente', un INSERT debe fallar con
-- "new row violates row-level security policy for table \"productos\"".
