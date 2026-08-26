-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Supabase Storage para imagenes de producto
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere `supabase/admin_policies.sql` (define public.es_admin()).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bucket publico `productos`
--
-- `public = true` hace que los objetos se sirvan por URL sin firmar, que es lo
-- que devuelve `getPublicUrl()` y lo que la tienda necesita para mostrarlas.
-- Ojo: publico significa que quien tenga la URL ve el archivo; el bucket no es
-- sitio para nada sensible.
--
-- Los limites de tamaño y tipo son la segunda linea de defensa: la validacion
-- de `src/actions/productos.ts` corre en la app, esta corre en el servidor de
-- Storage y no se puede saltar.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos',
  'productos',
  true,
  5242880,  -- 5 MB por archivo
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Politicas sobre storage.objects
--
-- `storage.objects` ya tiene RLS habilitado por Supabase; aqui solo se añaden
-- politicas. Todas filtran por `bucket_id` para no afectar a otros buckets.
-- -----------------------------------------------------------------------------
drop policy if exists "Imagenes de productos visibles para todos" on storage.objects;
drop policy if exists "Solo admins suben imagenes de productos"   on storage.objects;
drop policy if exists "Solo admins editan imagenes de productos"  on storage.objects;
drop policy if exists "Solo admins borran imagenes de productos"  on storage.objects;

-- SELECT: lectura abierta, incluido `anon` (la tienda publica no tiene sesion).
create policy "Imagenes de productos visibles para todos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'productos');

-- INSERT: solo administradores.
create policy "Solo admins suben imagenes de productos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'productos' and public.es_admin());

-- UPDATE: hace falta para que `upload({ upsert: true })` pueda sobrescribir un
-- objeto existente. `using` decide que fila se puede tocar y `with check`
-- valida el resultado; se necesitan las dos.
create policy "Solo admins editan imagenes de productos"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'productos' and public.es_admin())
  with check (bucket_id = 'productos' and public.es_admin());

-- DELETE: solo administradores.
create policy "Solo admins borran imagenes de productos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'productos' and public.es_admin());

-- -----------------------------------------------------------------------------
-- Verificacion
-- -----------------------------------------------------------------------------
-- select id, public, file_size_limit, allowed_mime_types
-- from storage.buckets where id = 'productos';
--
-- select policyname, cmd, roles from pg_policies
-- where schemaname = 'storage' and tablename = 'objects'
-- order by policyname;
