// Prueba de la API MiCorreo contra el ambiente de TEST, para responder lo que
// el manual no aclara antes de usarla en el CRM:
//   1. ¿El login con /token funciona con las credenciales que dio Correo?
//   2. ¿Cuál es el customerId de la cuenta? (si falta MICORREO_CUSTOMER_ID)
//   3. ¿Cuánto cotiza /rates con la fórmula de la caja vs. /rates/packages?
//   4. ¿Acepta un extOrderId alfanumérico ("PEL...")? ¿Rechaza importar dos veces?
//   5. ¿/shipping/tracking encuentra el envío con el extOrderId como shippingId?
//
// Uso:  node scripts/test-micorreo.mjs
// Lee .env: MICORREO_USER, MICORREO_PASSWORD y MICORREO_CUSTOMER_ID. Si no hay
// customerId, lo busca con MICORREO_EMAIL y MICORREO_EMAIL_PASSWORD (el login
// del portal de MiCorreo). Nunca imprime credenciales ni el token.

import { request } from "node:https";

try {
  process.loadEnvFile(".env");
} catch {
  console.error("No se encontró .env (correr desde la raíz del proyecto).");
  process.exit(1);
}

const BASE = (process.env.MICORREO_BASE_URL || "https://apitest.correoargentino.com.ar/micorreo/v1").replace(/\/$/, "");
if (!BASE.includes("apitest")) {
  console.error(`MICORREO_BASE_URL apunta a ${BASE}: este script solo corre contra el ambiente de test.`);
  process.exit(1);
}
const { MICORREO_USER, MICORREO_PASSWORD } = process.env;
if (!MICORREO_USER || !MICORREO_PASSWORD) {
  console.error("Faltan MICORREO_USER y MICORREO_PASSWORD en .env.");
  process.exit(1);
}

function titulo(t) {
  console.log(`\n=== ${t} ===`);
}

async function llamar(metodo, ruta, { body, token, basic } = {}) {
  // Produccion corta la conexion con el User-Agent "node" (ver correo-argentino.ts).
  const headers = { "Content-Type": "application/json", "User-Agent": "Peliando-CRM/1.0" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (basic) headers.Authorization = `Basic ${Buffer.from(basic).toString("base64")}`;
  const payload = body ? JSON.stringify(body) : undefined;
  if (payload) headers["Content-Length"] = Buffer.byteLength(payload);

  // https a mano y no fetch: /shipping/tracking es un GET con body.
  return new Promise((resolve, reject) => {
    const req = request(`${BASE}${ruta}`, { method: metodo, headers, timeout: 20000 }, (res) => {
      let texto = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (texto += c));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(texto);
        } catch {}
        resolve({ status: res.statusCode, json, texto });
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end(payload);
  });
}

function mostrar(res) {
  console.log(`HTTP ${res.status}`);
  console.log(res.json ? JSON.stringify(res.json, null, 2) : res.texto.slice(0, 1000));
}

// La caja del juego (igual que medidasPaquete en src/lib/services/correo-argentino.ts).
const caja = (q) => ({ weight: 500 * q, height: 5 * q, width: 12, length: 20 });
const CP_ORIGEN = "1900";
const CP_DESTINO = "1425"; // CABA, de prueba

titulo("1. Login (/token)");
const login = await llamar("POST", "/token", { basic: `${MICORREO_USER}:${MICORREO_PASSWORD}` });
if (!login.json?.token) {
  mostrar(login);
  process.exit(1);
}
const token = login.json.token;
console.log(`OK. Vence: ${login.json.expire ?? login.json.expires}`);

titulo("2. customerId");
let customerId = process.env.MICORREO_CUSTOMER_ID;
if (customerId) {
  console.log(`Se usa MICORREO_CUSTOMER_ID del .env: ${customerId}`);
} else if (process.env.MICORREO_EMAIL && process.env.MICORREO_EMAIL_PASSWORD) {
  const v = await llamar("POST", "/users/validate", {
    token,
    body: { email: process.env.MICORREO_EMAIL, password: process.env.MICORREO_EMAIL_PASSWORD },
  });
  mostrar(v);
  customerId = v.json?.customerId;
  if (customerId) console.log(`\n>>> Agregá a .env: MICORREO_CUSTOMER_ID=${customerId}`);
}
if (!customerId) {
  console.error(
    "Sin customerId no se puede seguir. Poné MICORREO_CUSTOMER_ID en .env, o MICORREO_EMAIL y " +
      "MICORREO_EMAIL_PASSWORD (login del portal de MiCorreo) para buscarlo.",
  );
  process.exit(1);
}

titulo("3a. Cotización /rates con la fórmula (1 y 3 cajas, a domicilio)");
for (const q of [1, 3]) {
  const r = await llamar("POST", "/rates", {
    token,
    body: { customerId, postalCodeOrigin: CP_ORIGEN, postalCodeDestination: CP_DESTINO, deliveredType: "D", dimensions: caja(q) },
  });
  console.log(`\n-- ${q} caja(s): ${JSON.stringify(caja(q))}`);
  mostrar(r);
}

titulo("3b. Cotización /rates/packages (3 cajas, Correo calcula el apilado)");
mostrar(
  await llamar("POST", "/rates/packages", {
    token,
    body: {
      customerId,
      postalCodeOrigin: CP_ORIGEN,
      postalCodeDestination: CP_DESTINO,
      deliveredType: "D",
      dimensions: [{ quantity: 3, ...caja(1) }],
    },
  }),
);

titulo("4. Alta /shipping/import (extOrderId alfanumérico)");
const extOrderId = `PELTEST${Date.now()}`;
const envio = {
  customerId,
  extOrderId,
  orderNumber: extOrderId,
  // Remitente vacio, como el CRM (src/lib/services/correo-argentino.ts).
  sender: {
    name: null,
    phone: null,
    cellPhone: null,
    email: null,
    originAddress: { streetName: null, streetNumber: null, floor: null, apartment: null, city: null, provinceCode: null, postalCode: null },
  },
  recipient: { name: "Prueba Peliando", email: "prueba@example.com", phone: "", cellPhone: "" },
  shipping: {
    deliveryType: "D",
    productType: "CP",
    agency: null,
    address: { streetName: "Av. Corrientes", streetNumber: "1234", floor: "", apartment: "", city: "CABA", provinceCode: "C", postalCode: CP_DESTINO },
    weight: 500,
    declaredValue: 30000,
    height: 5,
    length: 20,
    width: 12,
  },
};
console.log(`extOrderId: ${extOrderId}`);
const alta = await llamar("POST", "/shipping/import", { token, body: envio });
mostrar(alta);

titulo("4b. Mismo extOrderId de nuevo (se espera 'La orden fue importada con anterioridad')");
mostrar(await llamar("POST", "/shipping/import", { token, body: envio }));

titulo("5. Seguimiento /shipping/tracking con el extOrderId como shippingId");
mostrar(await llamar("GET", "/shipping/tracking", { token, body: { shippingId: extOrderId } }));

console.log(
  "\nListo. Mandale esta salida a Claude Code (no tiene credenciales). Fijate también en el portal " +
    `de MiCorreo de test si aparece el pedido ${extOrderId} y si desde ahí se puede imprimir la etiqueta.`,
);
