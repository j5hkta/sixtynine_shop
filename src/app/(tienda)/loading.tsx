/**
 * Fallback de Suspense para la tienda pública.
 *
 * Igual que en el panel, se renderiza dentro del layout del segmento: el
 * Navbar y el pie siguen en pantalla y esto ocupa el hueco del contenido. De
 * ahí el `min-h-[70vh]` en lugar de `min-h-screen`, que empujaría el pie fuera
 * de la vista.
 */
export default function TiendaLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-white px-4 text-center"
    >
      <span className="flex h-20 w-20 animate-pulse items-center justify-center bg-black font-mono text-3xl font-black text-white">
        69
      </span>

      <div className="space-y-3">
        <p className="text-sm font-bold tracking-[0.3em] text-black uppercase">
          Cargando...
        </p>
        <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
          Sixty Nine Skate &amp; Apparel
        </p>
      </div>

      <span className="h-1 w-16 animate-pulse bg-black/50" aria-hidden />
    </div>
  );
}
