import type { NextConfig } from "next";

// Cabeçalhos de segurança em toda resposta. Sem CSP de script de propósito: o Next injeta scripts inline e
// uma CSP restritiva exigiria nonce por requisição. Ficam só as diretivas que não quebram nada:
// `frame-ancestors` (clickjacking no painel), `base-uri` e `object-src`.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  // HSTS só em produção (em localhost/HTTP prenderia o navegador em HTTPS).
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
    : []),
];

const nextConfig: NextConfig = {
  // Não anuncia "X-Powered-By: Next.js" (fingerprinting de versão sem benefício).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // shared-types é TS sem build e agora exporta um valor (LEGAL_DOCS_VERSION), não só tipos.
  transpilePackages: ["@totalagenda/shared-types"],
  images: {
    // picsum.photos é usado como placeholder de fotografia editorial (ver seção 4.8 da
    // design-taste-frontend skill) até termos fotos reais de salões/barbearias clientes.
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
  experimental: {
    serverActions: {
      // Upload de logo/galeria (ver dashboard/configuracoes) comprime a imagem no navegador
      // antes de enviar, mas o limite padrão de 1MB do Server Action ainda pode ser
      // insuficiente pra fotos muito grandes/detalhadas — mesmo teto do backend
      // (MAX_IMAGE_SIZE_BYTES em tenants.service.ts), com folga pro overhead do multipart.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
