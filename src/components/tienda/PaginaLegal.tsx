import Link from "next/link";

/**
 * Contenedor de las páginas de texto legal.
 *
 * Tailwind Typography (`prose`) no está instalado en el proyecto, así que el
 * ritmo de lectura se compone a mano: ancho máximo de ~65 caracteres,
 * interlineado holgado y jerarquía por peso, no por color.
 */
export default function PaginaLegal({
  titulo,
  actualizado,
  entradilla,
  children,
}: {
  titulo: string;
  actualizado: string;
  entradilla: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <header className="border-b border-neutral-200 pb-8">
        <Link
          href="/"
          className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase underline-offset-4 hover:text-black hover:underline"
        >
          Inicio
        </Link>

        <h1 className="mt-4 text-3xl font-black tracking-tighter text-black uppercase sm:text-4xl">
          {titulo}
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-neutral-600">
          {entradilla}
        </p>

        <p className="mt-4 text-xs text-neutral-500">
          Última actualización: {actualizado}
        </p>
      </header>

      <div className="mt-10 space-y-10">{children}</div>
    </article>
  );
}

/** Sección numerada del documento. */
export function Seccion({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-black tracking-tight text-black uppercase">
        <span className="mr-3 font-mono text-neutral-400">
          {String(numero).padStart(2, "0")}
        </span>
        {titulo}
      </h2>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-700">
        {children}
      </div>
    </section>
  );
}

/** Lista con viñetas cuadradas, en línea con la estética del sitio. */
export function Lista({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, indice) => (
        <li key={indice} className="flex gap-3">
          <span
            className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 bg-black"
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
