import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // picsum.photos é usado como placeholder de fotografia editorial (ver seção 4.8 da
    // design-taste-frontend skill) até termos fotos reais de salões/barbearias clientes.
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
};

export default nextConfig;
