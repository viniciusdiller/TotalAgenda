// Única fonte de verdade dos hex da marca TotalAgenda (ícone "A" + wordmark).
// Paleta "3b" (verde + dourado) — a outra branch (feat/marca-roxo-coral) troca só
// estes valores, mais o bloco --color-accent-* de globals.css e app/icon.svg.
export const BRAND = {
  primary: "#10A37F",
  accentCheck: "#F0C060",
  darkBg: "#0B2A22",
  wordmarkLight: "#0C7F62",
  wordmarkDark: "#7FDCC0",
} as const;
