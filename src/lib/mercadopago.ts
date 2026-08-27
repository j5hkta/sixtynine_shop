import "server-only";

import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

/**
 * Cliente de Mercado Pago.
 *
 * `MP_ACCESS_TOKEN` NO lleva el prefijo `NEXT_PUBLIC_` a propósito: es una
 * credencial privada que permite cobrar en tu nombre, así que nunca debe
 * llegar al bundle del navegador. El `import "server-only"` de arriba hace que
 * el build falle si algún Client Component importa este módulo por error.
 */
let cliente: MercadoPagoConfig | undefined;

export function getMercadoPagoClient(): MercadoPagoConfig {
  if (!cliente) {
    const accessToken = process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        "Falta MP_ACCESS_TOKEN en .env.local. Lo encuentras en " +
          "Mercado Pago > Tus integraciones > Credenciales.",
      );
    }

    cliente = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 10_000 },
    });
  }

  return cliente;
}

/** Cliente de preferencias (Checkout Pro). */
export function getPreferenceClient(): Preference {
  return new Preference(getMercadoPagoClient());
}

/** Cliente de pagos, usado por el webhook para verificar contra la API de MP. */
export function getPaymentClient(): Payment {
  return new Payment(getMercadoPagoClient());
}

export { MercadoPagoConfig, Payment, Preference };
