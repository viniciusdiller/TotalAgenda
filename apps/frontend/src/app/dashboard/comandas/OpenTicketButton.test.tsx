import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OpenTicketButton } from "./OpenTicketButton";
import { openTicketAction, searchClientsAction } from "./actions";

vi.mock("./actions", () => ({
  openTicketAction: vi.fn(),
  searchClientsAction: vi.fn(),
}));

const client = { id: "3f2b8c1e-8a3d-4c55-9d5e-0a1b2c3d4e5f", name: "Carla Souza", phone: "11987654321" };

// O jsdom não implementa <dialog>.showModal/close: simula só o atributo `open`.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

beforeEach(() => {
  vi.mocked(openTicketAction).mockReset().mockResolvedValue({ ok: true });
  vi.mocked(searchClientsAction).mockReset().mockResolvedValue({ ok: true, clients: [client] });
});

describe("OpenTicketButton", () => {
  it("sem escolher cliente, abre a comanda sem cliente", async () => {
    const user = userEvent.setup();
    render(<OpenTicketButton />);

    await user.click(screen.getByRole("button", { name: "Nova comanda" }));
    await user.click(screen.getByRole("button", { name: "Abrir sem cliente" }));

    await waitFor(() => expect(openTicketAction).toHaveBeenCalledWith({}));
  });

  it("escolhendo o cliente, o botão vira 'Abrir comanda' e envia o clientId", async () => {
    const user = userEvent.setup();
    render(<OpenTicketButton />);

    await user.click(screen.getByRole("button", { name: "Nova comanda" }));
    await user.type(screen.getByLabelText("Buscar cliente"), "carla");
    await user.click(await screen.findByRole("button", { name: /Carla Souza/ }));

    expect(screen.queryByRole("button", { name: "Abrir sem cliente" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Abrir comanda" }));
    await waitFor(() => expect(openTicketAction).toHaveBeenCalledWith({ clientId: client.id }));
  });

  it("trocar o cliente escolhido volta para a busca", async () => {
    const user = userEvent.setup();
    render(<OpenTicketButton />);

    await user.click(screen.getByRole("button", { name: "Nova comanda" }));
    await user.type(screen.getByLabelText("Buscar cliente"), "carla");
    await user.click(await screen.findByRole("button", { name: /Carla Souza/ }));
    await user.click(screen.getByRole("button", { name: "Trocar cliente" }));

    expect(screen.getByLabelText("Buscar cliente")).toBeInTheDocument();
  });

  it("erro do servidor ao abrir aparece no diálogo", async () => {
    vi.mocked(openTicketAction).mockResolvedValue({ ok: false, error: "Cliente não encontrado." });
    const user = userEvent.setup();
    render(<OpenTicketButton />);

    await user.click(screen.getByRole("button", { name: "Nova comanda" }));
    await user.click(screen.getByRole("button", { name: "Abrir sem cliente" }));

    expect(await screen.findByText("Cliente não encontrado.")).toBeInTheDocument();
  });

  it("busca sem resultado oferece cadastrar o cliente (e não afirma isso antes da resposta)", async () => {
    vi.mocked(searchClientsAction).mockResolvedValue({ ok: true, clients: [] });
    const user = userEvent.setup();
    render(<OpenTicketButton />);

    await user.click(screen.getByRole("button", { name: "Nova comanda" }));
    await user.type(screen.getByLabelText("Buscar cliente"), "zzz");

    expect(screen.queryByText(/Nenhum cliente encontrado/)).not.toBeInTheDocument();
    expect(await screen.findByText(/Nenhum cliente encontrado/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cadastrar novo cliente" })).toHaveAttribute("href", "/dashboard/clientes/novo");
  });
});
