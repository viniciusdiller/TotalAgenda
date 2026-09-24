"use client";

import { type ComponentPropsWithoutRef, forwardRef, useState } from "react";
import { formatMoneyInput } from "@/lib/masks";

// Campo de dinheiro "cru" (sem rótulo) para barras de ferramenta e formulários compactos. Para
// campo com rótulo use <MaskedInput mask="money" />. Os dígitos entram pela direita ("4590" → "45,90");
// o valor submetido é o texto ("1.234,56") e a Server Action converte com `moneyToCents`.
export const MoneyInput = forwardRef<
  HTMLInputElement,
  Omit<ComponentPropsWithoutRef<"input">, "type" | "onChange"> & { onChange?: (value: string) => void }
>(function MoneyInput({ defaultValue, value: controlled, onChange, ...props }, ref) {
  const [value, setValue] = useState(() => formatMoneyInput(String(controlled ?? defaultValue ?? "")));

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      {...props}
      value={controlled !== undefined ? formatMoneyInput(String(controlled)) : value}
      onChange={(e) => {
        let formatted = formatMoneyInput(e.target.value);
        // Backspace em "0,00" esvazia o campo (senão um campo opcional nunca poderia ser limpo).
        const inputType = (e.nativeEvent as InputEvent).inputType ?? "";
        if (inputType.startsWith("delete") && formatted === "0,00") formatted = "";
        if (controlled === undefined) setValue(formatted);
        onChange?.(formatted);
      }}
    />
  );
});
