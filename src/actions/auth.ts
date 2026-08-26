"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  redirect("/login");
}
