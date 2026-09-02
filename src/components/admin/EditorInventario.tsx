"use client";

import { useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";

import { TALLA_UNICA } from "@/lib/validacion";

type Fila = { clave: number; talla: string; cantidad: string };

/** Atajos para no teclear la misma serie en cada producto. */
const PLANTILLAS: { etiqueta: string; tallas: string[] }[] = [
  { etiqueta: "Ropa (S-XL)", tallas: ["S", "M", "L", "XL"] },
  { etiqueta: "Zapatillas (38-44)", tallas: ["38", "39", "40", "41", "42", "43", "44"] },
  { etiqueta: "Tablas (7.75-8.5)", tallas: ["7.75", "8.0", "8.25", "8.5"] },
  { etiqueta: "Sin tallas", tallas: [TALLA_UNICA] },
];

let siguienteClave = 0;
function nuevaFila(talla = "", cantidad = ""): Fila {
  siguienteClave += 1;
  return { clave: siguienteClave, talla, cantidad };
}

/**
 * Editor de inventario por talla.
 *
 * Envía dos campos repetidos, `inventario_talla` e `inventario_cantidad`, que
 * la Server Action empareja por posición con `formData.getAll()`. Un `<input>`
 * no sabe mandar un objeto, y montar el JSON aquí para meterlo en un campo
 * oculto dejaría la validación a merced de lo que el navegador serialice.
 *
 * Las filas se identifican por una clave propia y no por el índice del array:
 * con el índice, borrar la fila del medio hace que React reutilice los inputs
 * y el texto salta de fila.
 */
export default function EditorInventario({
  inicial,
}: {
  inicial: Record<string, number>;
}) {
  const [filas, setFilas] = useState<Fila[]>(() => {
    const entradas = Object.entries(inicial);
    return entradas.length > 0
      ? entradas.map(([talla, unidades]) => nuevaFila(talla, String(unidades)))
      : [nuevaFila()];
  });

  function actualizar(clave: number, campo: "talla" | "cantidad", valor: string) {
    setFilas((actuales) =>
      actuales.map((fila) =>
        fila.clave === clave ? { ...fila, [campo]: valor } : fila,
      ),
    );
  }

  function quitar(clave: number) {
    setFilas((actuales) => {
      const restantes = actuales.filter((fila) => fila.clave !== clave);
      // Nunca se queda sin filas: un formulario sin ningún campo de talla no
      // deja pista de qué falta y la acción lo rechazaría sin explicación.
      return restantes.length > 0 ? restantes : [nuevaFila()];
    });
  }

  function aplicarPlantilla(tallas: string[]) {
    setFilas(tallas.map((talla) => nuevaFila(talla, "0")));
  }

  const total = filas.reduce((suma, fila) => {
    const n = Number(fila.cantidad);
    return suma + (Number.isFinite(n) && fila.talla.trim() !== "" ? n : 0);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PLANTILLAS.map((plantilla) => (
          <button
            key={plantilla.etiqueta}
            type="button"
            onClick={() => aplicarPlantilla(plantilla.tallas)}
            className="border border-ink-line px-3 py-1.5 text-[10px] font-bold tracking-[0.1em] text-neutral-400 uppercase transition-colors hover:border-neon hover:text-neon"
          >
            {plantilla.etiqueta}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {filas.map((fila, indice) => (
          <li key={fila.clave} className="flex items-center gap-2">
            <input
              name="inventario_talla"
              type="text"
              value={fila.talla}
              onChange={(e) => actualizar(fila.clave, "talla", e.target.value)}
              maxLength={20}
              placeholder={indice === 0 ? "M" : "Talla"}
              aria-label={`Nombre de la talla ${indice + 1}`}
              className="min-w-0 flex-1 border border-ink-line bg-ink-soft px-3 py-2.5 text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none"
            />

            <input
              name="inventario_cantidad"
              type="number"
              min={0}
              step={1}
              value={fila.cantidad}
              onChange={(e) =>
                actualizar(fila.clave, "cantidad", e.target.value)
              }
              placeholder="0"
              aria-label={`Unidades de la talla ${indice + 1}`}
              className="w-24 shrink-0 border border-ink-line bg-ink-soft px-3 py-2.5 font-mono text-sm text-white transition-colors placeholder:text-neutral-600 focus:border-neon focus:outline-none"
            />

            <button
              type="button"
              onClick={() => quitar(fila.clave)}
              aria-label={`Quitar la talla ${fila.talla || indice + 1}`}
              className="shrink-0 border border-ink-line p-2.5 text-neutral-500 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setFilas((actuales) => [...actuales, nuevaFila()])}
          className="flex items-center gap-2 border border-dashed border-ink-line px-4 py-2.5 text-[11px] font-bold tracking-[0.15em] text-neutral-400 uppercase transition-colors hover:border-neon hover:text-neon"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Añadir talla
        </button>

        <p
          aria-live="polite"
          className="flex items-center gap-2 font-mono text-sm text-neutral-400"
        >
          <Package className="h-4 w-4 shrink-0" aria-hidden />
          {total} {total === 1 ? "unidad" : "unidades"} en total
        </p>
      </div>
    </div>
  );
}
