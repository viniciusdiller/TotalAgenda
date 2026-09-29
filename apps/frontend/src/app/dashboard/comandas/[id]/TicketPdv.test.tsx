import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Ticket } from "@totalagenda/shared-types";
import { TicketPdv } from "./TicketPdv";
import { cancelTicketAction, removeItemAction } from "../actions";

// Server Actions de verdade dependem de next/headers/cookies (contexto de requisição) — fora
// do runtime do Next elas não funcionam. O componente só importa as referências de função,
// então mockar o módulo inteiro basta pra testar a UI sem precisar de um backend.
vi.mock("../actions", () => ({
  addItemAction: vi.fn(),
  addPaymentAction: vi.fn(),
  cancelTicketAction: vi.fn(),
  closeTicketAction: vi.fn(),
  removeItemAction: vi.fn(),
  setDiscountAction: vi.fn(),
}));

const baseTicket: Ticket = {
  id: "ticket-1",
  status: "OPEN",
  appointmentId: null,
  client: null,
  note: null,
  openedAt: new Date().toISOString(),
  closedAt: null,
  discountCents: 0,
  subtotalCents: 5000,
  totalCents: 5000,
  paidCents: 0,
  dueCents: 5000,
  items: [
    {
      id: "item-1",
      kind: "CUSTOM",
      serviceId: null,
      productId: null,
      description: "Corte de teste",
      quantity: 1,
      unitPriceCents: 5000,
      totalCents: 5000,
      professional: null,
    },
  ],
  payments: [],
};

describe("TicketPdv", () => {
  beforeEach(() => {
    vi.mocked(removeItemAction).mockResolvedValue({ ok: true, ticket: { ...baseTicket, items: [] } });
    vi.mocked(cancelTicketAction).mockResolvedValue({ ok: true, ticket: { ...baseTicket, status: "CANCELED" } });
  });

  it("remover item pede confirmação antes de chamar removeItemAction", async () => {
    const user = userEvent.setup();
    render(<TicketPdv initialTicket={baseTicket} services={[]} products={[]} team={[]} />);

    await user.click(screen.getByRole("button", { name: "Remover item" }));

    const confirm = screen.getByRole("alertdialog", { name: "Remover este item?" });
    expect(confirm).toBeInTheDocument();
    expect(confirm).toHaveTextContent("Corte de teste");
    expect(removeItemAction).not.toHaveBeenCalled();
  });

  it("confirmar a remoção chama removeItemAction com o ticket e o item certos", async () => {
    const user = userEvent.setup();
    render(<TicketPdv initialTicket={baseTicket} services={[]} products={[]} team={[]} />);

    await user.click(screen.getByRole("button", { name: "Remover item" }));
    const confirm = screen.getByRole("alertdialog", { name: "Remover este item?" });
    await user.click(within(confirm).getByRole("button", { name: "Remover item" }));

    await waitFor(() => expect(removeItemAction).toHaveBeenCalledWith("ticket-1", "item-1"));
  });

  it("cancelar a comanda pede confirmação antes de chamar cancelTicketAction", async () => {
    const user = userEvent.setup();
    render(<TicketPdv initialTicket={baseTicket} services={[]} products={[]} team={[]} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    const confirm = screen.getByRole("alertdialog", { name: "Cancelar esta comanda?" });
    expect(confirm).toBeInTheDocument();
    expect(cancelTicketAction).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole("button", { name: "Cancelar comanda" }));
    await waitFor(() => expect(cancelTicketAction).toHaveBeenCalledWith("ticket-1"));
  });
});
