import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const producto = await prisma.producto.upsert({
    where: { id: "seed-producto-peliando" },
    update: {},
    create: {
      id: "seed-producto-peliando",
      nombre: "Peliando",
      descripcion: "Juego de mesa de debate sobre peliculas",
      stockActual: 200,
    },
  });

  const listaExistente = await prisma.listaDePrecios.findFirst({
    where: { estado: "ACTIVA" },
  });

  if (!listaExistente) {
    await prisma.listaDePrecios.create({
      data: {
        nombre: "Lista 2026",
        fechaInicioVigencia: new Date(),
        estado: "ACTIVA",
        pvp: 40000,
        tramos: {
          create: [
            { cantidadDesde: 10, precioUnitario: 22000 },
            { cantidadDesde: 20, precioUnitario: 20000 },
            { cantidadDesde: 40, precioUnitario: 19000 },
            { cantidadDesde: 100, precioUnitario: 18000 },
          ],
        },
      },
    });
  }

  console.log("Seed listo. Producto:", producto.nombre);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
