// Remonta a cada navegação: só opacidade de propósito — transform/filter aqui virariam o
// bloco de contenção dos elementos position:fixed (navbars) e eles deslizariam junto.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
