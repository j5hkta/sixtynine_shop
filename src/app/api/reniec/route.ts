const API_BASE =
  process.env.APIS_PERU_URL ?? "https://apisperu.com/api/v1/dni";

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
  const dni = new URL(request.url).searchParams.get("dni")?.trim() ?? "";

  if (!/^\d{8}$/.test(dni)) {
    return Response.json(
      { ok: false, error: "El DNI debe tener 8 dígitos." },
      { status: 400 },
    );
  }

  const token = process.env.APIS_PERU_TOKEN;

  if (!token) {
    console.error("[reniec] Falta APIS_PERU_TOKEN en .env.local.");
    // 503 y no 500: el servicio no está configurado, no es que haya fallado.
    // El checkout trata cualquier error como "escribe el nombre a mano".
    return Response.json(
      { ok: false, error: "Consulta de DNI no disponible." },
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
        { ok: false, error: "No se pudo consultar el DNI." },
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
      { ok: false, error: "No se pudo consultar el DNI." },
      { status: 502 },
    );
  }
}
