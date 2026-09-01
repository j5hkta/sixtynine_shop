import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Límite de peticiones por IP, compartido por todos los puntos que lo usan.
 *
 * Antes vivía dentro de `/api/reniec`. Se saca aquí porque ahora lo usan
 * también el acceso al panel y el buscador, y tener tres copias de la misma
 * lógica de "falla cerrado" es la forma segura de que una se quede atrás.
 */

/**
 * Espacios de nombres del contador.
 *
 * `rate_limits.ip` es la clave primaria, así que un único cubo por IP haría que
 * buscar productos consumiera el cupo de consultas de DNI. El prefijo separa
 * los presupuestos sin tocar el esquema.
 */
export type AmbitoLimite = "reniec" | "acceso" | "buscar" | "checkout";

/**
 * IP del cliente.
 *
 * `x-forwarded-for` puede traer una cadena («cliente, proxy1, proxy2»); la
 * primera entrada es el cliente original. Ojo: esa cabecera la puede falsear
 * quien llame directamente al servidor, así que esto sólo es fiable si delante
 * hay un proxy que la reescribe (Vercel, nginx y Cloudflare lo hacen).
 */
export function ipDeCabeceras(cabeceras: Headers): string {
  const reenviada = cabeceras.get("x-forwarded-for");
  if (reenviada) {
    const primera = reenviada.split(",")[0]?.trim();
    if (primera) return primera;
  }

  return cabeceras.get("x-real-ip")?.trim() ?? "";
}

/**
 * Resultado de la comprobación.
 *
 * Se distinguen tres estados y no dos porque «has gastado tu cupo» y «no he
 * podido comprobarlo» piden respuestas distintas, y el coste de equivocarse no
 * es el mismo en todos los puntos:
 *
 * - En `/api/reniec` y en el acceso al panel conviene fallar CERRADO: lo que se
 *   pierde es que el comprador escriba su nombre a mano, o que un administrador
 *   espere un minuto.
 * - En el checkout conviene fallar ABIERTO: si la `service_role` key falta o la
 *   base tose, cerrar la puerta significa que la tienda deja de vender. Ahí la
 *   protección de verdad es `procesar_checkout()`, que valida y descuenta el
 *   stock con las filas bloqueadas.
 *
 * Un módulo que decidiera esto por su cuenta se equivocaría en la mitad de los
 * casos, así que devuelve el estado y decide quien llama.
 */
export type EstadoLimite = "permitido" | "excedido" | "indisponible";

/**
 * Cuenta la petición y devuelve en qué estado queda.
 *
 * Nunca lanza: un fallo del limitador se comunica como `"indisponible"`.
 */
export async function comprobarLimite(
  ambito: AmbitoLimite,
  ip: string,
  max: number,
  ventanaSegundos: number,
): Promise<EstadoLimite> {
  // Sin IP identificable, todas las peticiones comparten un mismo cubo en vez
  // de quedar sin contar.
  const clave = `${ambito}:${ip || "desconocida"}`;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("verificar_rate_limit", {
      p_ip: clave,
      p_max: max,
      p_ventana_segundos: ventanaSegundos,
    });

    if (error) {
      console.error(`[limite] No se pudo verificar (${ambito}):`, error.message);
      return "indisponible";
    }

    return data === true ? "permitido" : "excedido";
  } catch (e) {
    console.error(
      `[limite] Comprobación no disponible (${ambito}):`,
      e instanceof Error ? e.message : e,
    );
    return "indisponible";
  }
}
