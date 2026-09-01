"use client";

import { type ComponentPropsWithoutRef, forwardRef, useState } from "react";
import { Input } from "./Input";
import { formatCPF, formatPhoneBR } from "@/lib/masks";

const FORMATTERS = {
  phone: formatPhoneBR,
  cpf: formatCPF,
} as const;

interface MaskedInputProps extends Omit<ComponentPropsWithoutRef<typeof Input>, "onChange"> {
  mask: keyof typeof FORMATTERS;
  onChange?: (value: string) => void;
}

// Formata só a exibição, digitando; o valor submetido no <form> continua o texto formatado
// (o backend normaliza telefone/CPF pra dígitos de qualquer forma — ver
// normalizePhone/sanitização de cpf no clients.service).
export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(function MaskedInput(
  { mask, defaultValue, value: controlledValue, onChange, ...props },
  ref,
) {
  const format = FORMATTERS[mask];
  const [value, setValue] = useState(() => format(String(controlledValue ?? defaultValue ?? "")));

  return (
    <Input
      ref={ref}
      inputMode={mask === "phone" || mask === "cpf" ? "numeric" : undefined}
      {...props}
      value={controlledValue !== undefined ? format(String(controlledValue)) : value}
      onChange={(e) => {
        const formatted = format(e.target.value);
        if (controlledValue === undefined) setValue(formatted);
        onChange?.(formatted);
      }}
    />
  );
});
