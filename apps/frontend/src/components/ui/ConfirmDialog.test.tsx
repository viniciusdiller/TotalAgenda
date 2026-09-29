import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

// userEvent não está nas devDependencies (só @testing-library/dom) — fireEvent seria uma
// opção, mas userEvent simula clique/teclado de verdade (incluindo o Escape). Ver setup.

function Harness({ tone = "neutral" as "neutral" | "danger", isLoading = false }) {
  const [open, setOpen] = useState(true);
  const onConfirm = vi.fn(() => setOpen(false));
  return (
    <>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir este item?"
        description="Não tem como desfazer."
        confirmLabel="Excluir"
        cancelLabel="Voltar"
        tone={tone}
        isLoading={isLoading}
        onConfirm={onConfirm}
      />
      {!open ? <p>fechado</p> : null}
    </>
  );
}

describe("ConfirmDialog", () => {
  it("não renderiza nada quando open é false", () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Título"
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("mostra título, descrição e os dois botões quando open", () => {
    render(<Harness />);
    expect(screen.getByRole("alertdialog", { name: "Excluir este item?" })).toBeInTheDocument();
    expect(screen.getByText("Não tem como desfazer.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("clicar em cancelar fecha sem chamar onConfirm", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByText("fechado")).toBeInTheDocument();
  });

  it("Escape fecha o diálogo", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("clicar em confirmar chama onConfirm", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(screen.getByText("fechado")).toBeInTheDocument());
  });

  it("com isLoading, os botões ficam desabilitados e o texto muda pra 'Aguarde...'", () => {
    render(<Harness isLoading />);
    expect(screen.getByRole("button", { name: "Aguarde..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeDisabled();
  });
});
