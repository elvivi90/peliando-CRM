import { request } from "node:https";

/**
 * Cliente de la API MiCorreo de Correo Argentino (manual "API MiCorreo",
 * version del 2026-05-18). Se eligio sobre Paq.ar 2.0 porque son las
 * credenciales que dio Correo; Paq.ar tiene etiqueta y tracking mas claros
 * pero no hay acceso. Lo que el manual NO resuelve y hay que confirmar en QA:
 * - /shipping/import solo devuelve {createdAt}: ni numero de seguimiento ni
 *   etiqueta (la etiqueta se imprime desde el portal de MiCorreo).
 * - /shipping/tracking pide un `shippingId` que ningun endpoint devuelve. Se
 *   prueba con el numero de seguimiento si ya se conoce y, si no, con el
 *   extOrderId que se mando al importar (ver consultarTracking).
 *
 * Variables de entorno: MICORREO_USER y MICORREO_PASSWORD (Basic Auth de
 * /token), MICORREO_CUSTOMER_ID (de /users/validate con el email y la
 * contraseña de la cuenta de MiCorreo) y MICORREO_BASE_URL (por defecto el
 * ambiente de test; en produccion https://api.correoargentino.com.ar/micorreo/v1).
 */

const BASE_URL_TEST = "https://apitest.correoargentino.com.ar/micorreo/v1";
const TIMEOUT_MS = 15000;
// El firewall de produccion corta la conexion (ECONNRESET) a los pedidos con
// el User-Agent por defecto de fetch ("node"): hay que mandar uno propio.
const USER_AGENT = "Peliando-CRM/1.0";

// Codigo postal desde donde despacha Peliando (Calle 42 N° 889, La Plata):
// origen de las cotizaciones. El alta NO manda la direccion del remitente
// (ver importarEnvio).
const CP_ORIGEN = "1900";

// "Clasico", el servicio contratado.
const PRODUCT_TYPE = "CP";

// Una caja del juego: las cajas se apilan, asi que solo crecen el alto, el
// peso y el valor declarado (que es fijo por unidad, no el precio de venta).
const CAJA = {
  largoCm: 20,
  anchoCm: 12,
  altoCm: 5,
  pesoG: 500,
  valorDeclarado: 30000,
};
// Tope de /rates: ningun lado puede pasar de 200 cm.
export const MAX_UNIDADES_POR_PAQUETE = Math.floor(200 / CAJA.altoCm);

export function medidasPaquete(cantidad: number) {
  return {
    length: CAJA.largoCm,
    width: CAJA.anchoCm,
    height: CAJA.altoCm * cantidad,
    weight: CAJA.pesoG * cantidad,
    declaredValue: CAJA.valorDeclarado * cantidad,
  };
}

type Credenciales = {
  user: string;
  password: string;
  customerId: string;
  baseUrl: string;
};

function credenciales(): Credenciales | null {
  const user = process.env.MICORREO_USER;
  const password = process.env.MICORREO_PASSWORD;
  const customerId = process.env.MICORREO_CUSTOMER_ID;
  if (!user || !password || !customerId) return null;
  return {
    user,
    password,
    customerId,
    baseUrl: (process.env.MICORREO_BASE_URL || BASE_URL_TEST).replace(/\/$/, ""),
  };
}

// Sin credenciales el CRM no crea envios (ni el webhook ni el formulario).
export function correoConfigurado() {
  return credenciales() !== null;
}

function requerirCredenciales() {
  const c = credenciales();
  if (!c) {
    throw new CorreoError(
      "Falta configurar MICORREO_USER, MICORREO_PASSWORD o MICORREO_CUSTOMER_ID.",
    );
  }
  return c;
}

export class CorreoError extends Error {}

// Los errores de MiCorreo vienen como {code, message}; /shipping/tracking
// responde 200 con {error}.
function mensajeDeError(json: unknown, status: number) {
  const j = (json ?? {}) as { message?: unknown; error?: unknown };
  const detalle = [j.message, j.error].find((v) => typeof v === "string" && v.trim() !== "");
  return detalle ? String(detalle).trim() : `Correo Argentino respondió HTTP ${status}`;
}

// El firewall de produccion corta muchas conexiones (ECONNRESET), mas o menos
// la mitad en las pruebas, antes de responder: se reintenta. Es seguro
// porque /token y /rates no cambian nada y un /shipping/import repetido
// responde "importada con anterioridad", que importarEnvio toma como exito.
// Los timeouts no se reintentan (cada uno ya espera TIMEOUT_MS).
const CODIGOS_REINTENTABLES = new Set(["ECONNRESET", "ECONNREFUSED", "EPIPE", "UND_ERR_SOCKET"]);
const ESPERAS_MS = [300, 1000, 2000];

async function conReintentos<T>(llamada: () => Promise<T>): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await llamada();
    } catch (err) {
      const e = err as { code?: string; cause?: { code?: string } };
      const codigo = e?.cause?.code ?? e?.code;
      if (intento >= ESPERAS_MS.length || !codigo || !CODIGOS_REINTENTABLES.has(codigo)) throw err;
      await new Promise((r) => setTimeout(r, ESPERAS_MS[intento]));
    }
  }
}

// El JWT dura un rato (`expire`, hora de Argentina; el manual lo llama
// `expires` pero la API real manda `expire`): se reusa entre
// llamadas de la misma instancia hasta 5 minutos antes de vencer.
let tokenCache: { token: string; venceMs: number } | null = null;

async function obtenerToken(c: Credenciales) {
  if (tokenCache && tokenCache.venceMs > Date.now()) return tokenCache.token;

  const res = await conReintentos(() =>
    fetch(`${c.baseUrl}/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${c.user}:${c.password}`).toString("base64")}`,
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.token) {
    throw new CorreoError(
      `No se pudo iniciar sesión en MiCorreo: ${mensajeDeError(json, res.status)}`,
    );
  }

  const expira = json.expire ?? json.expires;
  const vence = expira ? new Date(`${String(expira).replace(" ", "T")}-03:00`).getTime() : NaN;
  tokenCache = {
    token: json.token,
    venceMs: Number.isFinite(vence) ? vence - 5 * 60_000 : Date.now() + 10 * 60_000,
  };
  return json.token as string;
}

async function post<T>(ruta: string, body: unknown): Promise<T> {
  const c = requerirCredenciales();
  const token = await obtenerToken(c);
  const res = await conReintentos(() =>
    fetch(`${c.baseUrl}${ruta}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new CorreoError(mensajeDeError(json, res.status));
  return json as T;
}

// El manual documenta /shipping/tracking como GET con body JSON, que fetch
// no permite: se manda a mano con node:https.
async function getConBody<T>(ruta: string, body: unknown): Promise<T> {
  const c = requerirCredenciales();
  const token = await obtenerToken(c);
  const payload = JSON.stringify(body);

  const { status, texto } = await conReintentos(
    () =>
      new Promise<{ status: number; texto: string }>((resolve, reject) => {
        const req = request(
          `${c.baseUrl}${ruta}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "User-Agent": USER_AGENT,
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
            },
            timeout: TIMEOUT_MS,
          },
          (res) => {
            let texto = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => (texto += chunk));
            res.on("end", () => resolve({ status: res.statusCode ?? 0, texto }));
          },
        );
        req.on("timeout", () =>
          req.destroy(new CorreoError("Correo Argentino no respondió a tiempo")),
        );
        req.on("error", reject);
        req.end(payload);
      }),
  );

  let json: unknown = null;
  try {
    json = JSON.parse(texto);
  } catch {}
  if (
    status < 200 ||
    status >= 300 ||
    (json && !Array.isArray(json) && (json as { error?: unknown }).error)
  ) {
    throw new CorreoError(mensajeDeError(json, status));
  }
  return json as T;
}

export type Destino = {
  nombre: string;
  email: string;
  telefono: string | null;
  calle: string;
  numero: string;
  piso: string | null;
  departamento: string | null;
  barrio: string | null;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
};

/**
 * Celular en 10 digitos (area + numero, sin +54, 9, 0 ni separadores), como
 * el ejemplo del manual. El portal muestra los ultimos 8 como telefono y los
 * 2 anteriores como codigo de area (formato de Buenos Aires), asi que un
 * area de 3 o 4 digitos se ve mal partida, pero el numero llega entero: con
 * espacios o guiones se pierden digitos. Si no queda en 10, va como vino.
 */
export function celularCorreo(telefono: string | null) {
  if (!telefono) return "";
  let d = telefono.replace(/\D/g, "");
  if (d.startsWith("54")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  return d.length === 10 ? d : telefono.trim();
}

/**
 * Calle para el alta: con la altura incluida, porque el portal de MiCorreo
 * no muestra streetNumber en los pedidos importados (probado con texto y
 * numero). Piso y depto que no entran en los 3 caracteres que guarda Correo
 * (ej. "Manzana P, Casa19b" de Tiendup) van a continuacion en vez de
 * truncarse, y despues el barrio, que no tiene campo propio.
 */
export function direccionCorreo(
  d: Pick<Destino, "calle" | "numero" | "piso" | "departamento" | "barrio">,
) {
  const piso = d.piso?.trim() ?? "";
  const depto = d.departamento?.trim() ?? "";
  const extras = [piso, depto].filter((v) => v.length > 3);
  const barrio = d.barrio?.trim();
  if (barrio) extras.push(barrio);
  return {
    streetName: [`${d.calle.trim()} ${d.numero.trim()}`, ...extras].join(", "),
    floor: piso.length > 3 ? "" : piso,
    apartment: depto.length > 3 ? "" : depto,
  };
}

type Rate = { deliveredType: string; productType: string; price: number };

/** Precio del envio a domicilio "Clasico" para `cantidad` cajas. */
export async function cotizarEnvio(codigoPostalDestino: string, cantidad: number) {
  const { customerId } = requerirCredenciales();
  const m = medidasPaquete(cantidad);
  const res = await post<{ rates?: Rate[] }>("/rates", {
    customerId,
    postalCodeOrigin: CP_ORIGEN,
    postalCodeDestination: codigoPostalDestino,
    deliveredType: "D",
    dimensions: {
      weight: m.weight,
      height: m.height,
      width: m.width,
      length: m.length,
    },
  });
  const rate = res.rates?.find((r) => r.deliveredType === "D" && r.productType === PRODUCT_TYPE);
  if (!rate || !Number.isFinite(Number(rate.price))) {
    throw new CorreoError("Correo Argentino no devolvió precio para el envío Clásico a domicilio.");
  }
  return Number(rate.price);
}

/**
 * Importa el envio en MiCorreo (queda para pagar e imprimir la etiqueta en
 * el portal). Correo rechaza un extOrderId ya importado: si eso pasa en un
 * reintento, el envio ya estaba creado y se toma como exito.
 */
export async function importarEnvio(params: {
  extOrderId: string;
  orderNumber: string;
  destino: Destino;
  cantidad: number;
}) {
  const { customerId } = requerirCredenciales();
  const { destino: d } = params;
  const m = medidasPaquete(params.cantidad);
  const direccion = direccionCorreo(d);

  try {
    await post("/shipping/import", {
      customerId,
      extOrderId: params.extOrderId,
      orderNumber: params.orderNumber,
      // Remitente vacio, como el ejemplo del manual: Correo usa los datos de
      // la cuenta. El origen (sucursal LA PLATA 7, sin pick up) sale de la
      // configuracion de la cuenta en el portal de MiCorreo: la API no tiene
      // campo para eso. Si los pedidos vuelven a salir con pick up, revisar
      // esa configuracion.
      sender: {
        name: null,
        phone: null,
        cellPhone: null,
        email: null,
        originAddress: {
          streetName: null,
          streetNumber: null,
          floor: null,
          apartment: null,
          city: null,
          provinceCode: null,
          postalCode: null,
        },
      },
      recipient: {
        name: d.nombre,
        email: d.email,
        // Solo celular: el portal lo muestra entero en "Celular".
        phone: "",
        cellPhone: celularCorreo(d.telefono),
      },
      shipping: {
        deliveryType: "D",
        productType: PRODUCT_TYPE,
        agency: null,
        address: {
          ...direccion,
          streetNumber: d.numero,
          city: d.ciudad,
          provinceCode: d.provincia,
          postalCode: d.codigoPostal,
        },
        weight: m.weight,
        declaredValue: m.declaredValue,
        height: m.height,
        length: m.length,
        width: m.width,
      },
    });
  } catch (err) {
    // La API real responde "La orden fue importada con anterioridad." (el
    // manual dice "ya fue importada").
    if (err instanceof CorreoError && /fue importada/i.test(err.message)) return;
    throw err;
  }
}

export type Tracking = {
  trackingNumber: string | null;
  // Del mas nuevo al mas viejo, como los devuelve Correo.
  eventos: { evento: string; fecha: string }[];
};

type TrackingRespuesta = {
  trackingNumber?: string | null;
  events?: { event?: string; date?: string }[];
};

export async function consultarTracking(shippingId: string): Promise<Tracking> {
  const res = await getConBody<TrackingRespuesta[] | TrackingRespuesta>("/shipping/tracking", {
    shippingId,
  });
  const item = Array.isArray(res) ? res[0] : res;
  return {
    trackingNumber: item?.trackingNumber || null,
    eventos: (item?.events ?? [])
      .filter((e) => e.event)
      .map((e) => ({
        evento: String(e.event).trim(),
        fecha: String(e.date ?? ""),
      })),
  };
}
