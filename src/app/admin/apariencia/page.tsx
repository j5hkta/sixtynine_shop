import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  ImageUp,
  Images,
  Tag,
} from "lucide-react";

import {
  actualizarOrden,
  crearBanner,
  obtenerBanners,
} from "@/actions/banners";
import BotonEliminarBanner from "@/components/admin/BotonEliminarBanner";
import BotonEstadoBanner from "@/components/admin/BotonEstadoBanner";
import BotonGuardar from "@/components/admin/BotonGuardar";
import { DESTINO_TODO, DESTINOS_BANNER, rutaDeBanner } from "@/lib/banners";

export const metadata = {
  title: "Apariencia",
};

const inputClase =
  "w-full border border-ink-line bg-ink-soft px-4 py-3 text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none";

const labelClase =
  "block text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase";

const ayudaClase = "text-xs text-neutral-600";

export default async function AparienciaPage({
  searchParams,
}: PageProps<"/admin/apariencia">) {
  const { error, guardado } = await searchParams;

  const resultado = await obtenerBanners();
  const banners = resultado.ok ? resultado.banners : [];

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Tienda pública
        </p>
        <h1 className="mt-2 text-3xl leading-none font-black tracking-tighter text-white uppercase sm:text-4xl">
          Apariencia
        </h1>
        <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />
        <p className="mt-4 text-sm text-neutral-500">
          Banners de la portada. Con más de uno, la portada los muestra como
          carrusel deslizable.
        </p>
      </header>

      {guardado && !error && (
        <p
          role="status"
          className="flex items-start gap-2 border border-neon/40 bg-neon/10 px-4 py-3 text-sm text-neon"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Banners actualizados. Ya se ven en la portada.
        </p>
      )}

      {typeof error === "string" && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {!resultado.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudieron leer los banners: {resultado.error}. ¿Ejecutaste{" "}
          <code>supabase/banners.sql</code>?
        </p>
      )}

      {/* Lista de banners */}
      <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
          <Images className="h-4 w-4" aria-hidden />
          Banners publicados ({banners.length})
        </h2>

        {banners.length === 0 ? (
          <p className="mt-6 border border-dashed border-ink-line px-6 py-10 text-center text-sm text-neutral-500">
            Todavía no hay banners. La portada muestra un bloque de respaldo
            hasta que subas el primero.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {banners.map((banner) => {
              const etiquetaDestino =
                banner.categoria === DESTINO_TODO
                  ? "Todo el catálogo"
                  : banner.categoria;

              return (
                <li
                  key={banner.id}
                  className={
                    // La fila oculta se marca con borde discontinuo y fondo
                    // apagado: hay que poder barrer la lista y ver de un vistazo
                    // qué está en la portada y qué no.
                    banner.activo
                      ? "flex flex-col gap-4 border border-ink-line bg-ink p-4 sm:flex-row sm:items-center"
                      : "flex flex-col gap-4 border border-dashed border-neutral-600 bg-ink/40 p-4 sm:flex-row sm:items-center"
                  }
                >
                  <div className="h-20 w-full shrink-0 overflow-hidden border border-ink-line bg-ink-soft sm:w-36">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={banner.imagen_url}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full object-cover ${
                        banner.activo ? "" : "opacity-40 grayscale"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`flex items-center gap-2 text-sm font-bold ${
                        banner.activo ? "text-white" : "text-neutral-500"
                      }`}
                    >
                      <Tag
                        className={`h-4 w-4 shrink-0 ${
                          banner.activo ? "text-neon" : "text-neutral-600"
                        }`}
                        aria-hidden
                      />
                      {etiquetaDestino}
                      {!banner.activo && (
                        <span className="inline-flex items-center gap-1 border border-ink-line px-2 py-0.5 text-[10px] font-bold tracking-[0.15em] text-neutral-500 uppercase">
                          <EyeOff className="h-3 w-3" aria-hidden />
                          Oculto
                        </span>
                      )}
                    </p>

                    <p className="mt-1 font-mono text-xs text-neutral-600">
                      {rutaDeBanner(banner.categoria)}
                    </p>
                  </div>

                  {/* Un formulario por fila: el id va en el closure del servidor
                    vía bind, no en un campo que se pueda reescribir. */}
                  <form
                    action={actualizarOrden.bind(null, banner.id)}
                    className="flex items-end gap-2"
                  >
                    <div className="space-y-1">
                      <label
                        htmlFor={`orden-${banner.id}`}
                        className="block text-[10px] font-bold tracking-[0.2em] text-neutral-600 uppercase"
                      >
                        Orden
                      </label>
                      <input
                        id={`orden-${banner.id}`}
                        name="orden"
                        type="number"
                        min={0}
                        max={999}
                        defaultValue={banner.orden}
                        className="w-20 border border-ink-line bg-ink-soft px-3 py-2 text-sm text-white focus:border-neon focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="border border-ink-line px-3 py-2 text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase transition-colors hover:border-neon hover:text-neon"
                    >
                      Mover
                    </button>
                  </form>

                  <BotonEstadoBanner
                    id={banner.id}
                    activo={banner.activo}
                    destino={etiquetaDestino}
                  />

                  <BotonEliminarBanner
                    id={banner.id}
                    destino={etiquetaDestino}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <p className={`${ayudaClase} mt-4`}>
          Se muestran de menor a mayor <code>orden</code>. Si dos coinciden,
          manda el más antiguo.
        </p>
      </section>

      {/* Alta */}
      <form
        action={crearBanner}
        encType="multipart/form-data"
        className="space-y-6 border border-ink-line bg-ink-soft p-6 sm:p-8"
      >
        <h2 className="text-[11px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
          Nuevo banner
        </h2>

        {/* Imagen */}
        <div className="space-y-2">
          <label htmlFor="imagen_upload" className={labelClase}>
            Imagen
          </label>

          <label
            htmlFor="imagen_upload"
            className="flex cursor-pointer items-center gap-3 border border-dashed border-ink-line bg-ink px-4 py-5 transition-colors hover:border-neon/50 hover:bg-neon/5"
          >
            <ImageUp
              className="h-5 w-5 shrink-0 text-neutral-500"
              aria-hidden
            />
            <span className="text-sm text-neutral-500">
              Selecciona la imagen del banner
            </span>
          </label>

          <input
            id="imagen_upload"
            name="imagen_upload"
            type="file"
            accept="image/*"
            required
            aria-describedby="imagen-ayuda"
            className="block w-full text-xs text-neutral-500 file:mr-4 file:border-0 file:bg-neon file:px-4 file:py-2 file:text-xs file:font-black file:tracking-widest file:text-ink file:uppercase hover:file:bg-white"
          />

          <p id="imagen-ayuda" className={ayudaClase}>
            JPG, PNG, WEBP, AVIF o GIF. Máximo 5 MB. Se sube al bucket{" "}
            <code>productos</code>, igual que las fotos de producto. Recomendado
            un formato apaisado y ancho (por ejemplo 1920×640), porque ocupa
            todo el ancho de la pantalla. Usa la misma proporción en todos: en
            el carrusel se ven uno detrás de otro y una altura distinta hace que
            la página dé un salto al deslizar.
          </p>
        </div>

        {/* Destino */}
        <div className="space-y-2">
          <label htmlFor="categoria" className={labelClase}>
            Destino
          </label>

          <select
            id="categoria"
            name="categoria"
            defaultValue={DESTINO_TODO}
            aria-describedby="categoria-ayuda"
            className={inputClase}
          >
            {DESTINOS_BANNER.map((destino) => (
              <option key={destino.valor} value={destino.valor}>
                {destino.etiqueta}
              </option>
            ))}
          </select>

          <p id="categoria-ayuda" className={ayudaClase}>
            Adónde lleva el banner al pulsarlo. Las categorías salen de{" "}
            <code>src/lib/categorias.ts</code>, así que siempre apuntan a una
            página que existe.
          </p>
        </div>

        {/* Orden */}
        <div className="space-y-2">
          <label htmlFor="orden" className={labelClase}>
            Orden
          </label>

          <input
            id="orden"
            name="orden"
            type="number"
            min={0}
            max={999}
            defaultValue={banners.length}
            aria-describedby="orden-ayuda"
            className={`${inputClase} max-w-[10rem]`}
          />

          <p id="orden-ayuda" className={ayudaClase}>
            Posición en el carrusel, de menor a mayor. Déjalo como está para
            añadirlo al final.
          </p>
        </div>

        <div className="border-t border-ink-line pt-6">
          <BotonGuardar>Añadir Banner</BotonGuardar>
        </div>
      </form>
    </div>
  );
}
