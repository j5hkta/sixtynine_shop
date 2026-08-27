"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

export default function GaleriaProducto({
  imagenes,
  titulo,
}: {
  imagenes: string[];
  titulo: string;
}) {
  const [activa, setActiva] = useState(0);

  if (imagenes.length === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 border border-neutral-200 bg-neutral-100 text-neutral-400">
        <ImageOff className="h-10 w-10" aria-hidden />
        <span className="text-[10px] font-bold tracking-widest uppercase">
          Sin imagen
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden border border-neutral-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagenes[activa]}
          alt={`${titulo} — imagen ${activa + 1} de ${imagenes.length}`}
          className="h-full w-full object-cover"
        />
      </div>

      {imagenes.length > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {imagenes.map((url, indice) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setActiva(indice)}
                aria-label={`Ver imagen ${indice + 1}`}
                aria-current={indice === activa ? "true" : undefined}
                className={`block aspect-square w-full overflow-hidden border transition-colors ${
                  indice === activa
                    ? "border-black"
                    : "border-neutral-200 hover:border-black"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
