/**
 * Fallback de Suspense para todo el panel administrativo.
 *
 * Se renderiza DENTRO de `AdminShell` (el layout del segmento envuelve a su
 * `loading`), así que el sidebar y el header siguen visibles y solo parpadea
 * el área de contenido. Por eso no lleva fondo propio a pantalla completa.
 *
 * El esqueleto imita la forma que comparten las pantallas del panel — título,
 * regla neón y una rejilla de bloques — para que el salto al contenido real
 * sea lo menos brusco posible.
 */
export default function AdminLoading() {
  return (
    <div className="min-h-[60vh] space-y-8" role="status" aria-live="polite">
      <span className="sr-only">Cargando el panel...</span>

      {/* Marca + título */}
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 animate-pulse items-center justify-center bg-neon font-mono text-lg font-black text-ink">
          69
        </span>

        <div className="space-y-3">
          <div className="h-8 w-56 animate-pulse bg-white/5" />
          <div className="h-1 w-16 bg-neon/40" aria-hidden />
        </div>
      </div>

      {/* Rejilla de tarjetas (dashboard) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 animate-pulse border border-ink-line bg-ink-soft"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>

      {/* Filas de tabla (productos / pedidos) */}
      <div className="space-y-px border border-ink-line bg-ink-soft p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse bg-white/5"
            style={{ animationDelay: `${i * 70}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
