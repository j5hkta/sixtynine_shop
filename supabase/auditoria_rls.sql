-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Auditoria de RLS en tablas de escritura
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
--
-- Idempotente: se puede ejecutar tantas veces como haga falta. Reescribe desde
-- cero las politicas de INSERT / UPDATE / DELETE de las tablas que edita el
-- panel, para que todas dependan de la MISMA condicion: public.es_admin().
--
-- No toca las politicas de SELECT. La tienda es publica y tiene que poder leer
-- el catalogo sin sesion; lo que se audita aqui es exclusivamente la escritura.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. La funcion de la que cuelga todo
--
-- Se recrea aqui aunque ya la defina `admin_policies.sql`: este script tiene
-- que poder ejecutarse solo y dejar el sistema coherente. Si la funcion no
-- existiera, TODAS las politicas de abajo fallarian al evaluarse y el panel
-- dejaria de escribir sin explicacion.
--
--   - SECURITY DEFINER: omite RLS al leer `perfiles`, evitando dependencias
--     circulares si algun dia se endurece esa tabla.
--   - STABLE: Postgres la evalua una vez por consulta, no una por fila.
--   - search_path vacio: impide que un esquema malicioso secuestre las
--     referencias dentro de una funcion SECURITY DEFINER. Por eso todo va
--     calificado con `public.`.
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

revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 1. RLS activo en las cuatro tablas
--
-- Sin esto, las politicas existen pero no se aplican: la tabla queda abierta a
-- cualquiera con la anon key. Es el fallo mas caro y el mas facil de pasar por
-- alto, porque el panel sigue funcionando igual.
-- -----------------------------------------------------------------------------
alter table public.productos            enable row level security;
alter table public.banners              enable row level security;
alter table public.anuncios             enable row level security;
alter table public.configuracion_tienda enable row level security;

-- -----------------------------------------------------------------------------
-- 2. Bloque generico
--
-- Recorre las tablas y, para cada una, borra CUALQUIER politica de escritura
-- que tenga (se llame como se llame, la pusiera quien la pusiera) y planta las
-- tres cannonicas. Escrito asi y no como cuarenta sentencias sueltas porque el
-- riesgo real no es que falte una politica: es que sobreviva una vieja, con
-- otro nombre, que permita mas de lo que se cree.
--
-- `configuracion_tienda` esta en la lista de UPDATE pero NO en las de INSERT y
-- DELETE: ver el apartado 3.
-- -----------------------------------------------------------------------------
do $auditoria$
declare
  v_tabla    text;
  v_politica text;
  v_tablas   text[] := array['productos', 'banners', 'anuncios', 'configuracion_tienda'];
begin
  foreach v_tabla in array v_tablas
  loop
    -- 2a. Borrar toda politica de escritura preexistente.
    for v_politica in
      select policyname
        from pg_policies
       where schemaname = 'public'
         and tablename  = v_tabla
         and cmd in ('INSERT', 'UPDATE', 'DELETE')
    loop
      execute format(
        'drop policy if exists %I on public.%I', v_politica, v_tabla
      );
      raise notice 'Retirada politica % de %', v_politica, v_tabla;
    end loop;

    -- 2b. UPDATE. Hacen falta las dos clausulas: `using` decide que filas son
    --     visibles para actualizar y `with check` valida el resultado. Sin
    --     `with check`, un admin degradado a mitad de transaccion podria dejar
    --     la fila escrita.
    execute format($p$
      create policy "Solo admins actualizan %1$s"
        on public.%1$I
        for update
        to authenticated
        using (public.es_admin())
        with check (public.es_admin())
    $p$, v_tabla);

    -- 2c. INSERT y DELETE: en todas menos en configuracion_tienda.
    if v_tabla <> 'configuracion_tienda' then
      execute format($p$
        create policy "Solo admins crean %1$s"
          on public.%1$I
          for insert
          to authenticated
          with check (public.es_admin())
      $p$, v_tabla);

      execute format($p$
        create policy "Solo admins eliminan %1$s"
          on public.%1$I
          for delete
          to authenticated
          using (public.es_admin())
      $p$, v_tabla);
    end if;
  end loop;
end;
$auditoria$;

-- -----------------------------------------------------------------------------
-- 3. Por que configuracion_tienda no recibe INSERT ni DELETE
--
-- Pediste que las tres operaciones quedaran cerradas tras es_admin() en las
-- cuatro tablas. En esta, anadir esas dos politicas seria AFLOJAR la seguridad,
-- no reforzarla.
--
-- `configuracion_tienda` es una tabla de una sola fila (CHECK id = 1) que crea
-- `apariencia_schema.sql`. Hoy no tiene politica de INSERT ni de DELETE, y en
-- RLS la ausencia de politica significa "nadie, jamas, por ninguna via de la
-- API". Es mas estricto que "solo los administradores".
--
-- Crearlas permitiria que una cuenta admin comprometida borrase la fila de
-- configuracion. No se gana nada: la aplicacion solo hace UPDATE sobre ella.
--
-- Si alguna vez hiciera falta recrear la fila, se hace desde el SQL Editor,
-- que corre como `postgres` y omite RLS:
--   insert into public.configuracion_tienda (id, banner_link)
--   values (1, '/productos') on conflict (id) do nothing;
-- -----------------------------------------------------------------------------

-- =============================================================================
-- 4. Verificacion
-- =============================================================================

-- 4a. RLS activo en las cuatro. `rowsecurity` debe ser true en todas.
select c.relname            as tabla,
       c.relrowsecurity     as rls_activo,
       c.relforcerowsecurity as forzado_al_dueno
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('productos', 'banners', 'anuncios', 'configuracion_tienda')
 order by 1;

-- 4b. Toda politica de escritura debe mencionar es_admin() y aplicar a
--     `authenticated`. Cualquier fila con `revisar` distinto de 'ok' es un
--     agujero.
select tablename,
       policyname,
       cmd,
       roles,
       case
         when coalesce(qual, '') || coalesce(with_check, '') like '%es_admin%'
              and roles = '{authenticated}'
           then 'ok'
         else 'REVISAR'
       end as revisar
  from pg_policies
 where schemaname = 'public'
   and tablename in ('productos', 'banners', 'anuncios', 'configuracion_tienda')
   and cmd in ('INSERT', 'UPDATE', 'DELETE')
 order by tablename, cmd;

-- 4c. Recuento esperado: 3 politicas de escritura en productos, banners y
--     anuncios; 1 en configuracion_tienda. Total 10.
select count(*) as politicas_de_escritura
  from pg_policies
 where schemaname = 'public'
   and tablename in ('productos', 'banners', 'anuncios', 'configuracion_tienda')
   and cmd in ('INSERT', 'UPDATE', 'DELETE');

-- 4d. La prueba que de verdad importa no se puede hacer desde el SQL Editor,
--     porque ahi la sesion es `postgres` y omite RLS. Hay que probarlo desde la
--     aplicacion con una cuenta de rol 'cliente': cualquier alta de producto
--     debe fallar con
--       new row violates row-level security policy for table "productos"
-- =============================================================================
