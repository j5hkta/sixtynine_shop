-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Roles y control de acceso (RBAC)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Requiere haber ejecutado antes `supabase/schema.sql`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: perfiles
-- Extiende `auth.users` (que es de Supabase y no se debe modificar) con los
-- datos propios de la aplicacion. `on delete cascade` borra el perfil cuando
-- se elimina la cuenta.
-- -----------------------------------------------------------------------------
create table if not exists public.perfiles (
  id        uuid        primary key references auth.users (id) on delete cascade,
  rol       text        not null default 'cliente'
                        check (rol in ('cliente', 'admin')),
  creado_en timestamptz not null default now()
);

comment on table  public.perfiles is 'Perfil de aplicacion asociado 1:1 a auth.users.';
comment on column public.perfiles.rol is 'cliente | admin. Solo admin accede a /admin.';

create index if not exists perfiles_rol_idx on public.perfiles (rol);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.perfiles enable row level security;

-- Lectura: cada usuario ve unicamente su propia fila. Es lo que necesita
-- `src/app/admin/layout.tsx` para resolver el rol de la sesion actual.
drop policy if exists "Cada usuario lee su propio perfil" on public.perfiles;

create policy "Cada usuario lee su propio perfil"
  on public.perfiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- IMPORTANTE: a proposito NO se crea ninguna politica de INSERT/UPDATE/DELETE.
-- Sin ellas, RLS bloquea toda escritura desde el cliente, de modo que un
-- usuario no puede auto-asignarse rol 'admin'. Las filas las crea el trigger
-- de abajo (SECURITY DEFINER, omite RLS) y los cambios de rol se hacen desde
-- el SQL Editor o con la `service_role` key.

-- -----------------------------------------------------------------------------
-- Alta automatica de perfil al registrarse un usuario
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- `search_path` vacio evita que un esquema malicioso secuestre las referencias
-- dentro de una funcion SECURITY DEFINER; por eso todo va calificado.
set search_path = ''
as $$
begin
  insert into public.perfiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Backfill: los usuarios que ya existian antes del trigger no tienen perfil.
-- Sin esto quedarian fuera del panel para siempre.
-- -----------------------------------------------------------------------------
insert into public.perfiles (id)
select u.id
from auth.users u
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- PASO MANUAL OBLIGATORIO
-- Nadie es 'admin' por defecto. Tras ejecutar este script, promueve tu cuenta
-- sustituyendo el email y descomentando:
-- -----------------------------------------------------------------------------
-- update public.perfiles
-- set rol = 'admin'
-- where id = (select id from auth.users where email = 'TU_EMAIL@ejemplo.com');

-- Verificacion:
-- select u.email, p.rol from public.perfiles p join auth.users u on u.id = p.id;
