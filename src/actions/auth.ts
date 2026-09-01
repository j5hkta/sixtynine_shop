"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { headers } from "next/headers";

import { z } from "zod";

import { comprobarLimite, ipDeCabeceras } from "@/lib/rate-limit";
import { RUTA_ACCESO } from "@/lib/rutas";
import { createClient } from "@/lib/supabase/server";
import { primerError } from "@/lib/validacion";

/**
 * Cupo de intentos de acceso por IP.
 *
 * Cuenta TODOS los intentos, acertados o no. Cinco en cinco minutos deja
 * margen de sobra para teclear mal la contraseña un par de veces y corta en
 * seco el relleno de credenciales, que necesita miles.
 */
const MAX_INTENTOS = 5;
const VENTANA_SEGUNDOS = 300;

export type ResultadoAcceso = { error: string } | undefined;

const esquemaAcceso = z.object({
  email: z.email("escribe un email válido").max(160),
  // Sin tope mínimo: quien ya tiene cuenta la tiene con la contraseña que sea,
  // y exigir aquí una longitud sólo delataría el formato esperado.
  password: z.string().min(1, "escribe tu contraseña").max(200),
  redirectTo: z
    .string()
    .optional()
    .default("/admin")
    // Sólo rutas internas: un `redirectTo` con `//evil.com` o una URL absoluta
    // convertiría el formulario de acceso en un redirector abierto.
    .transform((valor) =>
      valor.startsWith("/") && !valor.startsWith("//") ? valor : "/admin",
    ),
});

/**
 * Inicio de sesión.
 *
 * Vive en el servidor y no en el navegador para poder contar los intentos por
 * IP antes de tocar Supabase. Hecho desde el cliente con
 * `signInWithPassword()`, como estaba, no hay dónde poner ese contador: cada
 * intento va directo del navegador a Supabase.
 *
 * El mensaje de error es el mismo para email inexistente y contraseña
 * incorrecta, para no confirmar qué cuentas existen.
 */
export async function iniciarSesion(
  _anterior: ResultadoAcceso,
  formData: FormData,
): Promise<ResultadoAcceso> {
  const datos = esquemaAcceso.safeParse(Object.fromEntries(formData.entries()));

  if (!datos.success) {
    return { error: primerError(datos.error) };
  }

  // Falla CERRADO: si el limitador no responde, no se entra. El coste es que
  // un administrador espere cinco minutos; el de fallar abierto es dejar la
  // puerta sin contador justo cuando algo va mal.
  const limite = await comprobarLimite(
    "acceso",
    ipDeCabeceras(await headers()),
    MAX_INTENTOS,
    VENTANA_SEGUNDOS,
  );

  if (limite !== "permitido") {
    return {
      error: "Demasiados intentos. Espera unos minutos antes de reintentar.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: datos.data.email,
    password: datos.data.password,
  });

  if (error) {
    console.error("[acceso] Intento fallido:", error.message);
    return { error: "Email o contraseña incorrectos." };
  }

  // Fuera del try/catch y al final: `redirect()` funciona lanzando una
  // excepción interna de Next.
  redirect(datos.data.redirectTo);
}

/**
 * Cierra la sesion del usuario.
 *
 * Se ejecuta en el servidor, asi que `signOut()` puede borrar las cookies de
 * sesion en la respuesta (un `signOut()` desde el navegador dejaria al servidor
 * viendo al usuario como autenticado hasta el siguiente refresco).
 *
 * `redirect()` funciona lanzando una excepcion interna de Next: debe quedar
 * fuera de cualquier try/catch o el framework no podra completarla.
 */
export async function logoutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  // Invalida el Router Cache de todas las rutas bajo el layout raiz, para que
  // ninguna pagina renderizada con el usuario anterior quede cacheada.
  revalidatePath("/", "layout");

  // A la pantalla de acceso y no a la portada: quien cierra sesion en el panel
  // casi siempre quiere volver a entrar. `signOut()` borra las cookies de
  // Supabase pero no la de la puerta (`sn_acceso`), asi que esta ruta sigue
  // siendo alcanzable sin pasar otra vez por `ADMIN_PATH`.
  redirect(RUTA_ACCESO);
}
