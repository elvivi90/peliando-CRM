// Consulta (SOLO LECTURA) de los pagos recibidos en la cuenta REAL de Mercado
// Pago, para ver como llegan los cobros de las ventas de Tiendup antes de
// conciliarlas en el CRM:
//   1. ¿Es la cuenta que tiene conectada Tiendup? (/users/me)
//   2. ¿Que trae cada pago en external_reference / description / metadata?
//      ¿Alcanza para encontrar la orden de Tiendup (numero o id)?
//   3. ¿Cuanto descuenta Mercado Pago (fee_details, net_received_amount) y
//      como cambia con las cuotas y el medio de pago?
//   4. ¿Cuando queda disponible la plata (money_release_date) segun las cuotas?
//
// Uso:  node scripts/consultar-mercadopago.mjs [dias]   (por defecto 30)
// Lee MERCADOPAGO_ACCESS_TOKEN de .env (Access Token de produccion de la
// cuenta real). Solo hace GET. No imprime el token, ni el email, documento o
// tarjeta de los compradores.

try {
  process.loadEnvFile(".env");
} catch {
  console.error("No se encontró .env (correr desde la raíz del proyecto).");
  process.exit(1);
}
const TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("Falta MERCADOPAGO_ACCESS_TOKEN en .env.");
  process.exit(1);
}
const dias = Number(process.argv[2] ?? 30);

async function get(ruta) {
  const res = await fetch(`https://api.mercadopago.com${ruta}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`HTTP ${res.status} en ${ruta.split("?")[0]}:`, JSON.stringify(json));
    process.exit(1);
  }
  return json;
}

console.log("=== 1. Cuenta ===");
const me = await get("/users/me");
console.log(JSON.stringify({ id: me.id, nickname: me.nickname, tags: me.tags }));

console.log(`\n=== 2/3. Pagos recibidos de los ultimos ${dias} dias ===`);
const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
const hasta = new Date().toISOString();
const pagos = [];
for (let offset = 0; offset < 500; offset += 50) {
  const res = await get(
    `/v1/payments/search?range=date_created&begin_date=${desde}&end_date=${hasta}` +
      `&sort=date_created&criteria=desc&limit=50&offset=${offset}&collector.id=${me.id}`,
  );
  pagos.push(...(res.results ?? []));
  if (!res.results?.length || pagos.length >= (res.paging?.total ?? 0)) break;
}
console.log(`${pagos.length} pago(s)\n`);

const suma = (fees) => (fees ?? []).reduce((t, f) => t + (f.amount ?? 0), 0);
for (const p of pagos) {
  console.log(
    [
      p.id,
      (p.date_approved ?? p.date_created ?? "").slice(0, 16),
      `${p.status}/${p.status_detail}`,
      p.operation_type,
      `${p.payment_type_id}:${p.payment_method_id}`,
      `${p.installments}c`,
      `monto ${p.transaction_amount}`,
      `pagado ${p.transaction_details?.total_paid_amount}`,
      `neto ${p.transaction_details?.net_received_amount}`,
      `comisiones ${suma(p.fee_details)} ${JSON.stringify((p.fee_details ?? []).map((f) => `${f.type}:${f.amount}`))}`,
      `libera ${(p.money_release_date ?? "").slice(0, 10)} (${p.money_release_status})`,
      `ext_ref ${JSON.stringify(p.external_reference)}`,
      `desc ${JSON.stringify(p.description)}`,
      `metadata ${JSON.stringify(p.metadata ?? {})}`,
    ].join(" | "),
  );
}

// Un pago aprobado completo, sin los datos del comprador, para ver todos los
// campos disponibles.
const ejemplo = pagos.find((p) => p.status === "approved" && p.operation_type === "regular_payment") ?? pagos[0];
if (ejemplo) {
  const { payer, card, additional_info, ...resto } = ejemplo;
  console.log("\n=== Ejemplo completo (sin payer, card ni additional_info) ===");
  console.log(JSON.stringify(resto, null, 2));
  console.log(`claves de additional_info: ${Object.keys(additional_info ?? {}).join(", ")}`);
  void payer;
  void card;
}

console.log(
  "\nListo. Mandale esta salida a Claude Code junto con los numeros de 2 o 3 ordenes de Tiendup " +
    "de esas fechas, para ver con que campo se pueden emparejar.",
);
