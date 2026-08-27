import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/** Cookie que acredita haber entrado por la ruta secreta. */
const COOKIE_PUERTA = "sn_acceso";

/** Rutas internas del panel. Sólo alcanzables tras pasar por la puerta. */
const RUTAS_PRIVADAS = ["/admin", "/login"];

type Puerta =
  | { activa: false }
  | { activa: true; prefijo: string | null };

/**
 * Estado de la puerta de acceso al panel.
 *
 * - `ADMIN_PATH` definida  -> puerta activa con ese prefijo, en cualquier entorno.
 * - Sin definir, en desarrollo -> puerta desactivada: `/admin` funciona como siempre.
 * - Sin definir, en producción -> puerta activa SIN prefijo válido, es decir,
 *   todo el panel responde 404. Es deliberado: una web publicada sin la
 *   variable configurada no debe exponer el panel por defecto. Hay que
 *   definirla antes de desplegar.
 */
function estadoPuerta(): Puerta {
  const prefijo = process.env.ADMIN_PATH?.trim().replace(/^\/+|\/+$/g, "");

  if (prefijo) return { activa: true, prefijo };

  if (process.env.NODE_ENV !== "production") return { activa: false };

  console.error(
    "[proxy] ADMIN_PATH sin definir en producción: el panel responderá 404. " +
      "Defínela en las variables de entorno del despliegue.",
  );
  return { activa: true, prefijo: null };
}

function esRutaPrivada(pathname: string): boolean {
  return RUTAS_PRIVADAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
}

/**
 * Responde como cualquier página inexistente.
 *
 * Se reescribe a una ruta que no existe en lugar de devolver un 404 pelado,
 * para que un escáner reciba exactamente la misma página que con cualquier
 * URL inventada y no pueda distinguir "no existe" de "existe pero protegido".
 */
function comoInexistente(request: NextRequest) {
  return NextResponse.rewrite(new URL("/_ruta-inexistente", request.nextUrl));
}

/**
 * A partir de Next.js 16 el antiguo `middleware.ts` se llama `proxy.ts` y la
 * función exportada debe llamarse `proxy`. Corre en runtime `nodejs`.
 *
 * Responsabilidades:
 *  1. Ocultar el panel tras la ruta secreta de `ADMIN_PATH`.
 *  2. Refrescar el token de sesión de Supabase y escribirlo en la respuesta.
 *  3. Expulsar a `/login` a quien no tenga sesión al entrar a `/admin/*`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const puerta = estadoPuerta();

  // --- 1. Entrada por la ruta secreta --------------------------------------
  // Sella una cookie y manda al login. A partir de ahí el panel navega con sus
  // rutas normales, así que no hay que reescribir ningún enlace interno.
  if (
    puerta.activa &&
    puerta.prefijo &&
    (pathname === `/${puerta.prefijo}` || pathname === `/${puerta.prefijo}/`)
  ) {
    const respuesta = NextResponse.redirect(new URL("/login", request.nextUrl));

    respuesta.cookies.set(COOKIE_PUERTA, puerta.prefijo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return respuesta;
  }

  // --- 2. Todo lo que no es panel sigue su camino --------------------------
  // Importante salir antes de crear el cliente de Supabase: este proxy corre
  // ahora en todas las rutas, incluida la tienda estática.
  if (!esRutaPrivada(pathname)) {
    return NextResponse.next();
  }

  // --- 3. Puerta cerrada ----------------------------------------------------
  if (puerta.activa) {
    // El valor guardado es el propio prefijo: al rotar `ADMIN_PATH`, las
    // cookies antiguas dejan de servir sin tener que invalidarlas a mano.
    const sello = request.cookies.get(COOKIE_PUERTA)?.value;

    if (!puerta.prefijo || sello !== puerta.prefijo) {
      return comoInexistente(request);
    }
  }

  // `/login` ya pasó la puerta; la autenticación se comprueba sólo en /admin.
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // --- 4. Sesión de Supabase ------------------------------------------------
  // Se reasigna dentro de `setAll` para arrastrar las cookies refrescadas.
  let response = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // Cabeceras anti-caché que exige @supabase/ssr: una respuesta con
        // `Set-Cookie` de sesión jamás debe quedar cacheada en un CDN, o un
        // visitante podría recibir la sesión de otro.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // `getUser()` valida el token contra Supabase (a diferencia de `getSession()`,
  // que sólo lee la cookie). Debe llamarse antes de generar la respuesta para
  // que un refresco de token alcance a escribirse.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set(
      "redirectTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * El matcher tiene que ser una constante analizable en el build, así que no
 * puede construirse con `ADMIN_PATH`. Se filtra aquí lo que nunca interesa
 * (estáticos, imágenes, rutas de API) y el resto se decide en el código.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
  ],
};
