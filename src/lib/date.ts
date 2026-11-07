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
  return fechaInputValue(new Date());
}

/**
 * Valor para un <input type="date"> a partir de una fecha guardada con
 * parseFechaInput. Usa la hora LOCAL del proceso, la misma con la que se
 * guardo (medianoche local), asi que hay que llamarla del mismo lado: en el
 * servidor si la fecha se parseo en una server action.
 */
export function fechaInputValue(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
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

const OFFSET_ARGENTINA_MS = 3 * 60 * 60 * 1000;

/**
 * Dia ("YYYY-MM-DD") y hora ("HH:mm") de un instante en hora de Argentina,
 * sin depender de la zona horaria del proceso (en Vercel es UTC). La hora
 * viene vacia si el instante es medianoche exacta: asi se guardan las ventas
 * de las que no se sabe la hora (las cargadas antes de pedirla).
 */
export function partesArgentina(fecha: Date): { fecha: string; hora: string } {
  const iso = new Date(fecha.getTime() - OFFSET_ARGENTINA_MS).toISOString();
  const hora = iso.slice(11, 23) === "00:00:00.000" ? "" : iso.slice(11, 16);
  return { fecha: iso.slice(0, 10), hora };
}

/**
 * Fecha de una venta a partir de los campos del formulario: dia y hora en
 * hora de Argentina. Sin hora queda a medianoche de Argentina ("sin hora").
 */
export function parseFechaVenta(fecha: string, hora?: string | null): Date {
  const hhmm = hora && /^\d{2}:\d{2}$/.test(hora.trim()) ? hora.trim() : "00:00";
  return parseFechaHoraArgentina(`${fecha} ${hhmm}:00`);
}

/** Año y mes (1-12) de hoy en Argentina, sea cual sea la zona del proceso. */
export function mesActualArgentina(): { anio: number; mes: number } {
  const [anio, mes] = partesArgentina(new Date()).fecha.split("-").map(Number);
  return { anio, mes };
}

/**
 * Periodo [inicio, fin] (fin inclusive, al ultimo milisegundo) para filtrar
 * instantes reales, como la fecha de una venta o de un cobro: del dia 1 del
 * mes (o del año, sin `mes`) a medianoche de Argentina al ultimo
 * milisegundo del periodo. Una venta del 31 a las 22 h queda en ese mes.
 */
export function periodoArgentina(anio: number, mes?: number): { inicio: Date; fin: Date } {
  const inicio = Date.UTC(anio, mes ? mes - 1 : 0, 1) + OFFSET_ARGENTINA_MS;
  const siguiente = Date.UTC(mes ? anio : anio + 1, mes ? mes : 0, 1) + OFFSET_ARGENTINA_MS;
  return { inicio: new Date(inicio), fin: new Date(siguiente - 1) };
}

/**
 * Periodo [inicio, fin] para fechas de calendario guardadas con
 * parseFechaInput (gastos): esas quedan a medianoche del proceso que las
 * guardo, 00:00 UTC en Vercel o 03:00 UTC en una compu en Argentina, asi que
 * el dia que representan es siempre su dia UTC.
 */
export function periodoCalendario(anio: number, mes?: number): { inicio: Date; fin: Date } {
  const inicio = Date.UTC(anio, mes ? mes - 1 : 0, 1);
  const siguiente = Date.UTC(mes ? anio : anio + 1, mes ? mes : 0, 1);
  return { inicio: new Date(inicio), fin: new Date(siguiente - 1) };
}

/** Hora actual ("HH:mm") en LOCAL, para el <input type="time"> del formulario. */
export function horaActualInputValue(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
