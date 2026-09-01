-- =============================================================================
-- Sixty Nine Skate & Apparel Store - Borrado de datos de prueba
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
--
-- IRREVERSIBLE. TRUNCATE no se puede deshacer una vez confirmada la
-- transaccion y no deja las filas recuperables como si fuera un DELETE.
-- Haz una copia de seguridad antes (Dashboard > Database > Backups).
--
-- NO toca: auth.users, public.perfiles, public.configuracion_tienda.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Antes de borrar: mira lo que te vas a llevar por delante
-- -----------------------------------------------------------------------------
-- select 'productos' as tabla, count(*) from public.productos
-- union all select 'pedidos',       count(*) from public.pedidos
-- union all select 'pedidos_items', count(*) from public.pedidos_items
-- union all select 'banners',       count(*) from public.banners
-- union all select 'anuncios',      count(*) from public.anuncios;

-- -----------------------------------------------------------------------------
-- 1. El borrado
--
-- Una sola sentencia con todas las tablas, no cinco seguidas. Asi es atomica
-- (o se vacian todas o ninguna), toma los bloqueos de una vez y evita el
-- problema del orden: `pedidos_items` referencia a `productos` y a `pedidos`,
-- y truncarlas por separado obligaria a acertar la secuencia.
--
-- CASCADE es imprescindible: aunque `pedidos_items.producto_id` sea
-- ON DELETE RESTRICT, eso no aplica a TRUNCATE. Sin CASCADE, Postgres rechaza
-- truncar una tabla referenciada por una clave foranea.
--
-- Ojo con CASCADE: arrastra ademas CUALQUIER tabla que referencie a estas,
-- aunque no este en la lista. Hoy la unica es `pedidos_items`, que ya aparece
-- escrita a proposito para que se vea. Si mañana añades otra tabla con una FK
-- a `pedidos` o `productos`, este script la vaciara tambien sin avisar.
--
-- RESTART IDENTITY no hace nada aqui: las cinco tablas usan
-- `uuid default gen_random_uuid()` y no tienen ninguna secuencia que reiniciar.
-- Se deja porque es inofensivo y por si algun dia se añade una columna serial.
--
-- `public.clientes` NO aparece porque NO EXISTE. Los clientes del panel se
-- derivan agrupando `public.pedidos`; no hay tabla propia. Incluirla abortaria
-- la sentencia entera y no se borraria nada.
-- -----------------------------------------------------------------------------
truncate table
  public.pedidos_items,
  public.pedidos,
  public.productos,
  public.banners,
  public.anuncios
restart identity cascade;

-- -----------------------------------------------------------------------------
-- 2. Comprobacion: las cinco a cero, y lo que debia sobrevivir intacto
-- -----------------------------------------------------------------------------
select 'productos'            as tabla, count(*) as filas from public.productos
union all select 'pedidos',            count(*) from public.pedidos
union all select 'pedidos_items',      count(*) from public.pedidos_items
union all select 'banners',            count(*) from public.banners
union all select 'anuncios',           count(*) from public.anuncios
union all select 'perfiles (INTACTA)', count(*) from public.perfiles
union all select 'config  (INTACTA)',  count(*) from public.configuracion_tienda
order by 1;

-- Y que tu acceso de administrador sigue en pie:
-- select u.email, p.rol
--   from public.perfiles p join auth.users u on u.id = p.id;

-- -----------------------------------------------------------------------------
-- 3. Opcional: contadores del limitador de peticiones
--
-- `rate_limits` guarda cuantas consultas de DNI ha hecho cada IP en el ultimo
-- minuto. No son datos de prueba ni de negocio, se regeneran solos y caducan.
-- Vaciarla solo sirve para empezar limpio de verdad.
-- -----------------------------------------------------------------------------
-- truncate table public.rate_limits;

-- =============================================================================
-- LO QUE ESTE SCRIPT NO HACE
--
-- Las imagenes siguen en Storage. Vaciar `productos` y `banners` borra las
-- filas, pero los archivos del bucket `productos` se quedan huerfanos ocupando
-- espacio. Para limpiarlos: Dashboard > Storage > productos > seleccionar y
-- eliminar. Hazlo DESPUES de comprobar que no queda ninguna fila apuntando a
-- ellos, porque el nombre de cada objeto es el hash de su contenido y una misma
-- imagen puede estar compartida entre un producto y un banner.
-- =============================================================================
