import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Las imagenes de producto viajan dentro del propio Server Action, y el
      // limite por defecto es de 1MB para todo el cuerpo de la peticion. El
      // limite se aplica al multipart completo (varios archivos + campos +
      // cabeceras de cada parte), no a cada archivo por separado.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
