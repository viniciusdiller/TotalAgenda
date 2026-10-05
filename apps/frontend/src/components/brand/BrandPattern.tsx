import clsx from "clsx";

// Ladrilho 120px da marca (public/brand/pattern). Camada decorativa: ocupa o pai inteiro
// (ou o que o `className` restringir), fica atrás do conteúdo (-z-10) e não recebe clique.
// O pai PRECISA de `relative isolate`, senão o -z-10 desce atrás do fundo do próprio pai e o
// padrão some.
//  - "auto": claro no tema claro, escuro no tema escuro (fundos neutros)
//  - "dark": sobre fundo escuro fixo (ex.: bloco zinc-900 que não muda de tema)
//  - "purple": sobre fundo roxo da marca
// `mask` esvazia partes do padrão (CSS mask-image) pra ele nunca competir com o texto.
const FILE = { claro: "claro", dark: "escuro", purple: "roxo" } as const;

function Layer({
  file,
  mask,
  size,
  className,
}: {
  file: (typeof FILE)[keyof typeof FILE];
  mask?: string;
  size: number;
  className?: string;
}) {
  return (
    <div
      className={clsx("absolute inset-0", className)}
      style={{
        backgroundImage: `url('/brand/pattern/pattern-${file}-transparente.svg')`,
        backgroundSize: `${size}px`,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}

export function BrandPattern({
  tone = "auto",
  mask,
  size = 120,
  className,
}: {
  tone?: "auto" | "dark" | "purple";
  mask?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={clsx("pointer-events-none absolute inset-0 -z-10", className)}>
      {tone === "auto" ? (
        <>
          <Layer file="claro" mask={mask} size={size} className="dark:hidden" />
          <Layer file="escuro" mask={mask} size={size} className="hidden dark:block" />
        </>
      ) : (
        <Layer file={FILE[tone]} mask={mask} size={size} />
      )}
    </div>
  );
}
