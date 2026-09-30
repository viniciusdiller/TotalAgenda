import type { CSSProperties } from "react";

/**
 * Style for the `animate-rise-in` stagger (globals.css reads `--i` for the delay).
 * Caps the index so long lists don't produce an absurd wait before the last row appears.
 */
export function riseIn(i: number, cap = 8): CSSProperties {
  return { "--i": Math.min(i, cap) } as CSSProperties;
}
