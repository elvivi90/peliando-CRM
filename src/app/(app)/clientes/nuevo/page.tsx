import { PageHeader } from "@/components/ui/page-header";
import { ClienteForm } from "@/components/clientes/cliente-form";

export default function NuevoClientePage() {
  return (
    <div>
      <PageHeader title="Nuevo cliente" />
      <ClienteForm />
    </div>
  );
}
