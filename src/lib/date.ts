/**
 * Convierte el valor de un <input type="date"> ("YYYY-MM-DD") en un Date a
 * medianoche LOCAL. `new Date("YYYY-MM-DD")` lo interpreta como medianoche
 * UTC, lo que en timezones detras de UTC (como Argentina, UTC-3) corre la
 * fecha un dia para atras al mostrarla. Los campos de fecha de este CRM son
 * fechas de calendario puras (sin hora), asi que siempre hay que parsearlas
 * con esta funcion en vez de `new Date(string)`.
 */
export function parseFechaInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Valor de "hoy" para un <input type="date">, en hora LOCAL. `new
 * Date().toISOString().slice(0, 10)` usa UTC, que en Argentina (UTC-3)
 * muestra el dia siguiente entre las 21:00 y las 23:59.
 */
export function todayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convierte una fecha-hora "YYYY-MM-DD HH:mm:ss" en hora de Argentina (como
 * la que manda la API de Tiendup) a un Date UTC correcto. Sin el offset
 * explicito, `new Date("YYYY-MM-DDTHH:mm:ss")` la interpreta como hora LOCAL
 * del proceso que corre el codigo, que en Vercel es UTC — corriendo el
 * resultado 3 horas y, en compras de noche, hasta un dia entero. Argentina
 * no usa horario de verano desde 2009, asi que el offset -03:00 es fijo.
 */
export function parseFechaHoraArgentina(value: string): Date {
  return new Date(`${value.replace(" ", "T")}-03:00`);
}
