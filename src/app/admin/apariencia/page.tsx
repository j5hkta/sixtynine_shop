import { AlertTriangle, CheckCircle2, ImageUp, Link2 } from "lucide-react";

import { actualizarApariencia } from "@/actions/apariencia";
import BotonGuardar from "@/components/admin/BotonGuardar";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { data: config, error: errorCarga } = await supabase
    .from("configuracion_tienda")
    .select("banner_imagen, banner_link")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <p className="text-[11px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
          Tienda pública
        </p>
        <h1 className="mt-2 text-3xl leading-none font-black tracking-tighter text-white uppercase sm:text-4xl">
          Apariencia
        </h1>
        <span className="mt-4 block h-1 w-16 bg-neon" aria-hidden />
        <p className="mt-4 text-sm text-neutral-500">
          Banner principal de la portada.
        </p>
      </header>

      {guardado && !error && (
        <p
          role="status"
          className="flex items-start gap-2 border border-neon/40 bg-neon/10 px-4 py-3 text-sm text-neon"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Banner actualizado. Ya se ve en la portada.
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

      {errorCarga && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          No se pudo leer la configuración: {errorCarga.message}. ¿Ejecutaste{" "}
          <code>supabase/apariencia_schema.sql</code>?
        </p>
      )}

      <form
        action={actualizarApariencia}
        encType="multipart/form-data"
        className="space-y-6 border border-ink-line bg-ink-soft p-6 sm:p-8"
      >
        {/* Vista previa */}
        <div className="space-y-2">
          <span className={labelClase}>Banner actual</span>

          {config?.banner_imagen ? (
            <div className="overflow-hidden border border-ink-line bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={config.banner_imagen}
                alt="Banner actual de la portada"
                className="h-auto w-full object-cover"
              />
            </div>
          ) : (
            <p className="border border-dashed border-ink-line px-6 py-10 text-center text-sm text-neutral-500">
              Todavía no hay banner. La portada muestra un bloque de respaldo
              hasta que subas uno.
            </p>
          )}
        </div>

        {/* Nueva imagen */}
        <div className="space-y-2">
          <label htmlFor="banner_upload" className={labelClase}>
            Reemplazar imagen
          </label>

          <label
            htmlFor="banner_upload"
            className="flex cursor-pointer items-center gap-3 border border-dashed border-ink-line bg-ink px-4 py-5 transition-colors hover:border-neon/50 hover:bg-neon/5"
          >
            <ImageUp className="h-5 w-5 shrink-0 text-neutral-500" aria-hidden />
            <span className="text-sm text-neutral-500">
              Selecciona la imagen del banner
            </span>
          </label>

          <input
            id="banner_upload"
            name="banner_upload"
            type="file"
            accept="image/*"
            aria-describedby="banner-ayuda"
            className="block w-full text-xs text-neutral-500 file:mr-4 file:border-0 file:bg-neon file:px-4 file:py-2 file:text-xs file:font-black file:tracking-widest file:text-ink file:uppercase hover:file:bg-white"
          />

          <p id="banner-ayuda" className={ayudaClase}>
            JPG, PNG, WEBP, AVIF o GIF. Máximo 5 MB. Se sube al bucket{" "}
            <code>productos</code>, igual que las fotos de producto. Recomendado
            un formato apaisado y ancho (por ejemplo 1920×640), porque ocupa
            todo el ancho de la pantalla. Si no eliges ninguna, se conserva la
            actual.
          </p>
        </div>

        {/* Enlace */}
        <div className="space-y-2">
          <label htmlFor="banner_link" className={labelClase}>
            Destino del banner
          </label>

          <div className="relative">
            <Link2
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-600"
              aria-hidden
            />
            <input
              id="banner_link"
              name="banner_link"
              type="text"
              defaultValue={config?.banner_link ?? "/productos"}
              placeholder="/productos/categoria/tablas"
              aria-describedby="link-ayuda"
              className={`${inputClase} pl-10 font-mono`}
            />
          </div>

          <p id="link-ayuda" className={ayudaClase}>
            Ruta interna, empezando por <code>/</code>. Ej:{" "}
            <code>/productos</code> o{" "}
            <code>/productos/categoria/zapatillas</code>.
            No se aceptan enlaces a otros dominios.
          </p>
        </div>

        <div className="border-t border-ink-line pt-6">
          <BotonGuardar>Guardar Banner</BotonGuardar>
        </div>
      </form>
    </div>
  );
}
