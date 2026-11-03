/**
 * Separa un celular argentino en codigo de area y numero, para cargarlo a
 * mano en el portal de MiCorreo: la API no tiene campo para el area y el
 * portal corta siempre los ultimos 8 digitos como numero (formato de Buenos
 * Aires), asi que un area de 3 o 4 digitos queda mal y hay que corregirla.
 *
 * Tiendup lo trae con el area separada por un espacio: "+54 221 502-0390",
 * "+54 9 11 3331-4716", "+54 2477 33-5328". Sin espacios solo se reconoce el
 * 11 (AMBA). Null si no es un numero argentino de 10 digitos reconocible.
 */
export function separarTelefono(telefono: string | null | undefined) {
  if (!telefono?.trim()) return null;
  const partes = telefono.trim().split(/\s+/);

  if (partes[0].startsWith("+") && !partes[0].startsWith("+54")) return null;
  if (partes.length > 1 && /^\+?54$/.test(partes[0])) partes.shift();
  if (partes[0] === "9" && partes.length > 2) partes.shift();

  let area: string;
  let numero: string;
  if (partes.length >= 2) {
    area = partes[0].replace(/\D/g, "").replace(/^0/, "");
    numero = partes.slice(1).join("").replace(/\D/g, "");
  } else {
    let d = partes.join("").replace(/\D/g, "");
    if (d.startsWith("54")) d = d.slice(2);
    if (d.length === 11 && d.startsWith("9")) d = d.slice(1);
    d = d.replace(/^0/, "");
    if (!/^11\d{8}$/.test(d)) return null;
    area = "11";
    numero = d.slice(2);
  }

  // "15" delante del numero (forma vieja de marcar celulares).
  if (area.length + numero.length === 12 && numero.startsWith("15")) numero = numero.slice(2);
  if (!/^\d{2,4}$/.test(area) || area.length + numero.length !== 10) return null;
  return { area, numero };
}
