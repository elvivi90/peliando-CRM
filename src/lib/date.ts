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
