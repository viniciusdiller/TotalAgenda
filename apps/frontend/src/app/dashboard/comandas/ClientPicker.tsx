"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { formatPhoneBR } from "@/lib/masks";
import { searchClientsAction, type ClientOption } from "./actions";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

// Busca de cliente por nome ou telefone. A busca roda no servidor (Server Action) a cada pausa na digitação;
// respostas que chegam fora de ordem são descartadas (só vale a da última digitação).
export function ClientPicker({
  onSelect,
  autoFocus = false,
}: {
  onSelect: (client: ClientOption) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  // Termo cuja resposta já chegou. Enquanto for diferente do digitado, a busca está pendente (debounce + rede).
  const [settledFor, setSettledFor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const searched = query.trim().length >= MIN_CHARS;

  useEffect(() => {
    const term = query.trim();
    const ticket = ++latest.current;
    if (term.length < MIN_CHARS) return;
    const timer = setTimeout(async () => {
      const result = await searchClientsAction(term);
      if (ticket !== latest.current) return; // chegou atrasada: já há uma busca mais nova
      setSettledFor(term);
      if (result.ok) {
        setResults(result.clients);
        setError(null);
      } else {
        setResults([]);
        setError(result.error);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Com menos de 2 caracteres nada de busca é mostrado (derivado, sem resetar estado no efeito).
  // "Nenhum cliente encontrado" só vale quando a resposta é da busca ATUAL (não do termo anterior).
  const settled = searched && settledFor === query.trim();
  const shownResults = settled ? results : [];
  const shownError = settled ? error : null;
  const shownLoading = searched && !settled;

  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 dark:border-white/15">
        <MagnifyingGlass size={16} className="text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={autoFocus}
          maxLength={100}
          placeholder="Buscar cliente por nome ou telefone"
          aria-label="Buscar cliente"
          className="w-full bg-transparent text-sm text-zinc-900 outline-none dark:text-white"
        />
      </div>

      <div className="mt-2 min-h-5 text-sm" aria-live="polite">
        {shownError ? <p className="text-red-600 dark:text-red-400">{shownError}</p> : null}
        {!shownError && shownLoading ? <p className="text-zinc-400">Buscando...</p> : null}
        {!shownError && !shownLoading && searched && shownResults.length === 0 ? (
          <p className="text-zinc-500 dark:text-stone-400">
            Nenhum cliente encontrado.{" "}
            <a
              href="/dashboard/clientes/novo"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent-600 hover:underline dark:text-accent-300"
            >
              Cadastrar novo cliente
            </a>
          </p>
        ) : null}
        {!searched ? (
          <p className="text-zinc-400 dark:text-stone-500">Digite ao menos {MIN_CHARS} letras ou números.</p>
        ) : null}
      </div>

      {shownResults.length > 0 ? (
        <ul className="mt-1 max-h-56 divide-y divide-zinc-100 overflow-y-auto rounded-lg border border-zinc-200 dark:divide-white/5 dark:border-white/10">
          {shownResults.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                onClick={() => onSelect(client)}
                className="hover-nudge flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-900/5 dark:hover:bg-white/5"
              >
                <span className="font-medium text-zinc-900 dark:text-white">{client.name}</span>
                <span className="text-xs text-zinc-500 dark:text-stone-400">{formatPhoneBR(client.phone)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
