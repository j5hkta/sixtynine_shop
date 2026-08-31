import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import CarruselBanners, {
  type BannerPortada,
} from "@/components/tienda/CarruselBanners";
import { type ProductoTarjeta } from "@/components/tienda/ProductCard";
import SeccionPortada from "@/components/tienda/SeccionPortada";
import SeccionRopa from "@/components/tienda/SeccionRopa";
import { DATOS_SECCION, type SeccionPortada as Seccion } from "@/lib/secciones";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * ISR: la página se sirve desde caché y, como mucho una vez cada 60 s, la
 * primera visita tras expirar dispara la regeneración en segundo plano. Nadie
 * espera por ella — quien llega recibe la versión anterior.
 *
 * Al tocar los banners o un producto desde el panel se llama a
 * `revalidatePath("/", "page")`, así que ese cambio no espera los 60 s.
 */
export const revalidate = 60;

export const metadata = {
  description:
    "Tablas, ruedas, zapatillas y ropa para los que viven sobre cuatro ruedas.",
};

const CAMPOS_TARJETA =
  "id, titulo, precio, precio_original, categoria, imagenes";

/** Tope por franja. Cuatro filas de cuatro en escritorio. */
const MAXIMO_POR_SECCION = 8;

type ProductoConSeccion = ProductoTarjeta & { seccion_portada: Seccion };

type DatosPortada = {
  /** Productos ya agrupados por franja. */
  secciones: Record<Seccion, ProductoTarjeta[]>;
  /** Últimos ingresos. Sólo se usan si ninguna franja tiene nada. */
  respaldo: ProductoTarjeta[];
  banners: BannerPortada[];
  error: string | null;
};

function seccionesVacias(): Record<Seccion, ProductoTarjeta[]> {
  return {
    tablas: [],
    completos: [],
    ropa: [],
    proteccion: [],
    ninguna: [],
  };
}

/**
 * Con ISR la página se prerenderiza durante el `next build`, así que un fallo
 * de Supabase (o unas credenciales sin configurar) tumbaría el build entero.
 * Se degrada al estado de error que la página ya sabe pintar; la siguiente
 * revalidación lo arregla sola en cuanto la base de datos responda.
 */
async function cargarPortada(): Promise<DatosPortada> {
  try {
    const supabase = createAnonClient();

    // Una sola consulta para las cuatro franjas y se agrupa en memoria: cuatro
    // consultas paralelas traerían lo mismo con cuatro viajes a la base.
    //
    // El cliente anónimo no lee cookies, así que la página sigue siendo
    // estática. La política RLS ya filtra los banners inactivos, pero el `.eq`
    // se deja explícito: quien lea esta consulta no debería tener que ir al SQL
    // para saber qué se está pidiendo.
    const [destacados, recientes, banners] = await Promise.all([
      supabase
        .from("productos")
        .select(`${CAMPOS_TARJETA}, seccion_portada`)
        .eq("estado", "activo")
        .neq("seccion_portada", "ninguna")
        .order("creado_en", { ascending: false }),
      supabase
        .from("productos")
        .select(CAMPOS_TARJETA)
        .eq("estado", "activo")
        .order("creado_en", { ascending: false })
        .limit(MAXIMO_POR_SECCION),
      supabase
        .from("banners")
        .select("id, imagen_url, categoria")
        .eq("activo", true)
        .order("orden", { ascending: true })
        .order("creado_en", { ascending: true }),
    ]);

    // Sólo los últimos ingresos son imprescindibles: si esa consulta falla, el
    // catálogo entero está inalcanzable y la portada no tiene nada que enseñar.
    if (recientes.error) throw recientes.error;

    // Las franjas, en cambio, se degradan. Es lo que pasa entre desplegar este
    // código y ejecutar `secciones_portada.sql`: la columna todavía no existe,
    // esta consulta da 42703 y la portada cae al respaldo de últimos ingresos
    // en lugar de quedarse en blanco.
    if (destacados.error) {
      console.error(
        "[tienda] No se pudieron leer las secciones de portada:",
        destacados.error.message,
      );
    }

    // Un fallo leyendo los banners no debe tumbar la portada entera: sin ellos
    // la página sigue siendo perfectamente usable.
    if (banners.error) {
      console.error(
        "[tienda] No se pudieron leer los banners:",
        banners.error.message,
      );
    }

    const secciones = seccionesVacias();

    for (const producto of (destacados.data ?? []) as ProductoConSeccion[]) {
      const grupo = secciones[producto.seccion_portada];
      // La franja de ropa reparte sus productos entre cuatro pestañas, así que
      // el tope se le aplica por pestaña, no al conjunto: con el límite global
      // una categoría con muchos productos vaciaría las otras tres.
      if (!grupo) continue;
      if (producto.seccion_portada !== "ropa" && grupo.length >= MAXIMO_POR_SECCION) {
        continue;
      }
      grupo.push(producto);
    }

    return {
      secciones,
      respaldo: recientes.data ?? [],
      banners: banners.data ?? [],
      error: null,
    };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error desconocido.";
    console.error("[tienda] No se pudo cargar la portada:", mensaje);
    return {
      secciones: seccionesVacias(),
      respaldo: [],
      banners: [],
      error: mensaje,
    };
  }
}

export default async function HomePage() {
  const { secciones, respaldo, banners, error } = await cargarPortada();

  const hayFranjas =
    secciones.tablas.length > 0 ||
    secciones.completos.length > 0 ||
    secciones.ropa.length > 0 ||
    secciones.proteccion.length > 0;

  return (
    <>
      {/* Banners, a todo el ancho */}
      <section>
        {banners.length > 0 ? (
          <CarruselBanners banners={banners} />
        ) : (
          // Respaldo mientras no haya banners subidos desde /admin/apariencia.
          <Link href="/productos" className="block w-full">
            <div className="flex min-h-[45vh] w-full flex-col items-center justify-center gap-6 bg-black px-4 py-24 text-center text-white">
              <h1 className="text-5xl leading-[0.9] font-black tracking-tighter uppercase sm:text-7xl">
                Outlet
                <br />
                Sixty Nine
              </h1>
              <p className="max-w-md text-sm text-white/60">
                Tablas, ruedas y ropa a precio de liquidación.
              </p>
              <span className="border border-white px-8 py-3 text-[11px] font-bold tracking-[0.25em] uppercase">
                Ver la colección
              </span>
            </div>
          </Link>
        )}
      </section>

      {error && (
        <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
          <p
            role="alert"
            className="flex items-start gap-2 border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            No se pudo cargar el catálogo: {error}
          </p>
        </section>
      )}

      {hayFranjas ? (
        <>
          <SeccionPortada
            titulo={DATOS_SECCION.tablas.titulo}
            verTodo={DATOS_SECCION.tablas.verTodo}
            productos={secciones.tablas}
          />

          <SeccionPortada
            titulo={DATOS_SECCION.completos.titulo}
            verTodo={DATOS_SECCION.completos.verTodo}
            productos={secciones.completos}
          />

          <SeccionRopa productos={secciones.ropa} />

          <SeccionPortada
            titulo={DATOS_SECCION.proteccion.titulo}
            verTodo={DATOS_SECCION.proteccion.verTodo}
            productos={secciones.proteccion}
          />
        </>
      ) : (
        /*
         * Nadie ha asignado franjas todavía (o acaba de ejecutarse la
         * migración, que deja todo en 'ninguna'). Sin este respaldo la portada
         * se quedaría en blanco bajo el banner hasta que alguien entrara al
         * panel a etiquetar productos uno a uno.
         */
        <SeccionPortada
          titulo="Últimos Ingresos"
          verTodo="/productos"
          productos={respaldo}
        />
      )}

      {!error && !hayFranjas && respaldo.length === 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <p className="border border-dashed border-neutral-300 px-6 py-20 text-center text-sm text-neutral-500">
            Todavía no hay productos publicados. Vuelve pronto.
          </p>
        </section>
      )}
    </>
  );
}
