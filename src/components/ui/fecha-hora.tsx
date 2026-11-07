import { fechaYHora } from "@/lib/format";

// Fecha de una venta con la hora en una linea debajo, mas chica. Las ventas
// sin hora conocida muestran solo el dia.
export function FechaHora({ value }: { value: Date | string }) {
  const { fecha, hora } = fechaYHora(value);
  return (
    <>
      <span className="block">{fecha}</span>
      {hora && <span className="block text-xs opacity-70">{hora}</span>}
    </>
  );
}
