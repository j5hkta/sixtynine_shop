"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { RUTA_ACCESO } from "@/lib/rutas";
import { createClient } from "@/lib/supabase/server";

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
