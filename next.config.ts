import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo desarrollo: permite abrir `next dev` desde el celular por la IP de la
  // red local (Next bloquea por defecto los assets de dev de otros origenes).
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
