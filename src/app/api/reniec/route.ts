import { createAdminClient } from "@/lib/supabase/admin";

const API_BASE =
  process.env.APIS_PERU_URL ?? "https://apisperu.com/api/v1/dni";

/** Mensaje único para todo lo que falla, para no revelar qué comprobación saltó. */
const ERROR_GENERICO = "No se pudo consultar el DNI.";

const MAX_PETICIONES = 5;
const VENTANA_SEGUNDOS = 60;

/**
 * IP del cliente.
 *
 * `x-forwarded-for` puede traer una cadena («cliente, proxy1, proxy2»); la
 * primera entrada es el cliente original. Ojo: esa cabecera la puede falsear
 * quien llame directamente al servidor, así que esto sólo es fiable si delante
 * hay un proxy que la reescribe (Vercel, nginx, Cloudflare lo hacen).
 */
function ipDelCliente(request: Request): string {
  const reenviada = request.headers.get("x-forwarded-for");
  if (reenviada) {
    const primera = reenviada.split(",")[0]?.trim();
    if (primera) return primera;
  }

  return request.headers.get("x-real-ip")?.trim() ?? "";
}

/**
 * Cuenta la petición y dice si se permite.
 *
 * Falla CERRADO: si no se puede comprobar el límite (falta la service_role key,
 * la base no responde, no se ejecutó `rate_limit.sql`), se rechaza. Un control
 * de abuso que se desactiva solo cuando algo va mal no protege nada, y el coste
 * aquí es sólo que el comprador escriba su nombre a mano.
 */
async function dentroDelLimite(ip: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("verificar_rate_limit", {
      p_ip: ip,
      p_max: MAX_PETICIONES,
      p_ventana_segundos: VENTANA_SEGUNDOS,
    });

    if (error) {
      console.error("[reniec] No se pudo verificar el rate limit:", error);
      return false;
    }

    return data === true;
  } catch (e) {
    console.error("[reniec] Rate limit no disponible:", e);
    return false;
  }
}

function esHostLocal(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  );
}

/** Origen (`https://host:puerto`) de una URL, o `null` si no es una URL válida. */
function origenDe(valor: string | null): string | null {
  if (!valor) return null;
  try {
    return new URL(valor).origin;
  } catch {
    return null;
  }
}

/**
 * Comprueba que la petición venga de nuestra propia web.
 *
 * Se mira `origin` y, si no viene, `referer`. Los navegadores NO envían
 * `Origin` en peticiones GET del mismo origen, así que quedarse sólo con esa
 * cabecera rechazaría precisamente el uso legítimo: el `fetch` del checkout.
 * `Referer` sí viaja con la política por defecto (`strict-origin-when-cross-origin`).
 *
 * ALCANCE REAL: ambas cabeceras las pone el cliente y cualquiera puede
 * falsificarlas con curl. Esto corta el uso desde otras webs y el abuso
 * casual, no a quien se lo proponga. Para eso hace falta límite por IP.
 */
function origenPermitido(request: Request): boolean {
  const sitio = origenDe(process.env.NEXT_PUBLIC_SITE_URL ?? null);

  // Sólo `NODE_ENV`. Es tentador aceptar además "la petición llegó a
  // localhost", pero detrás de un proxy inverso (nginx, Vercel, un contenedor)
  // Next ve TODAS las peticiones llegando por localhost, así que esa condición
  // quedaría siempre activa en producción y bastaría enviar
  // `Referer: http://localhost/` para saltarse la comprobación.
  const permitirLocal = process.env.NODE_ENV !== "production";

  const declarado =
    origenDe(request.headers.get("origin")) ??
    origenDe(request.headers.get("referer"));

  // Sin ninguna de las dos cabeceras no hay forma de saber de dónde viene.
  // Se rechaza: el checkout trata el fallo como "escribe el nombre a mano".
  if (!declarado) return false;

  if (sitio && declarado === sitio) return true;

  if (permitirLocal) {
    const hostDeclarado = new URL(declarado).hostname;
    if (esHostLocal(hostDeclarado)) return true;
  }

  return false;
}

/**
 * Consulta de DNI para autocompletar el nombre en el checkout.
 *
 * Actúa de proxy para que `APIS_PERU_TOKEN` no salga nunca del servidor: si el
 * navegador llamara directamente a APIsPERU, el token viajaría en el bundle y
 * cualquiera podría gastarlo.
 *
 * Devuelve siempre JSON y nunca propaga el cuerpo de error de la API externa,
 * que puede incluir detalles de la cuenta.
 */
export async function GET(request: Request) {
  if (!origenPermitido(request)) {
    return Response.json({ ok: false, error: ERROR_GENERICO }, { status: 403 });
  }

  const dni = new URL(request.url).searchParams.get("dni")?.trim() ?? "";

  if (!/^\d{8}$/.test(dni)) {
    return Response.json(
      { ok: false, error: "El DNI debe tener 8 dígitos." },
      { status: 400 },
    );
  }

  // Se cuenta después de validar el formato para no gastar cupo en peticiones
  // que nunca habrían llegado a la API externa. Sin IP identificable, todas
  // esas peticiones comparten un mismo cubo en vez de quedar sin contar.
  const ip = ipDelCliente(request) || "desconocida";

  if (!(await dentroDelLimite(ip))) {
    // Sin traza: la IP es un dato personal y el 429 ya queda en el log de
    // acceso del hosting. Los fallos de la propia comprobación sí se registran,
    // dentro de `dentroDelLimite()`.
    return Response.json(
      { ok: false, error: "Demasiadas consultas. Inténtalo en un minuto." },
      {
        status: 429,
        headers: { "Retry-After": String(VENTANA_SEGUNDOS) },
      },
    );
  }

  const token = process.env.APIS_PERU_TOKEN;

  if (!token) {
    console.error("[reniec] Falta APIS_PERU_TOKEN en .env.local.");
    // 503 y no 500: el servicio no está configurado, no es que haya fallado.
    // El checkout trata cualquier error como "escribe el nombre a mano".
    return Response.json(
      { ok: false, error: ERROR_GENERICO },
      { status: 503 },
    );
  }

  try {
    const respuesta = await fetch(`${API_BASE}/${dni}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      // El checkout no debe quedarse colgado esperando a un tercero.
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });

    if (!respuesta.ok) {
      console.error(
        `[reniec] APIsPERU respondió ${respuesta.status} para el DNI consultado.`,
      );
      return Response.json(
        { ok: false, error: ERROR_GENERICO },
        { status: 502 },
      );
    }

    const datos = (await respuesta.json()) as {
      nombres?: string;
      apellidoPaterno?: string;
      apellidoMaterno?: string;
    };

    const nombreCompleto = [
      datos.nombres,
      datos.apellidoPaterno,
      datos.apellidoMaterno,
    ]
      .map((parte) => parte?.trim())
      .filter(Boolean)
      .join(" ");

    if (!nombreCompleto) {
      return Response.json(
        { ok: false, error: "El DNI no devolvió un nombre." },
        { status: 404 },
      );
    }

    return Response.json({ ok: true, nombreCompleto });
  } catch (e) {
    console.error("[reniec] Fallo al consultar APIsPERU:", e);
    return Response.json(
      { ok: false, error: ERROR_GENERICO },
      { status: 502 },
    );
  }
}
