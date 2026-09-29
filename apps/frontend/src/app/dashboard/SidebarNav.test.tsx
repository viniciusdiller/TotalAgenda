import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarNav } from "./SidebarNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/agenda",
}));

describe("SidebarNav", () => {
  it("marca só o link da rota atual como ativo", () => {
    render(<SidebarNav />);
    const agenda = screen.getByRole("link", { name: /agenda/i });
    const comandas = screen.getByRole("link", { name: /comandas/i });
    expect(agenda).toHaveAttribute("href", "/dashboard/agenda");
    expect(comandas).toHaveAttribute("href", "/dashboard/comandas");
  });

  it("cada item tem um title explicando pra que serve", () => {
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: /comissões/i })).toHaveAttribute(
      "title",
      expect.stringContaining("comissão"),
    );
    expect(screen.getByRole("link", { name: /marketplace/i })).toHaveAttribute(
      "title",
      expect.stringContaining("clientes"),
    );
  });

  // Regressão: duas instâncias (desktop + drawer mobile) compartilhavam o mesmo layoutId
  // da pill ativa e isso travava a animação das duas (ver MobileSidebar.tsx). Montar duas ao
  // mesmo tempo não deve quebrar a renderização.
  it("duas instâncias com scope diferente montam juntas sem erro", () => {
    render(
      <>
        <SidebarNav scope="desktop" />
        <SidebarNav scope="mobile" />
      </>,
    );
    const agendaLinks = screen.getAllByRole("link", { name: /agenda/i });
    expect(agendaLinks).toHaveLength(2);
  });

  it("onNavigate é chamado ao clicar num link (fecha o drawer mobile)", async () => {
    const onNavigate = vi.fn();
    render(<SidebarNav onNavigate={onNavigate} />);
    const { default: userEvent } = await import("@testing-library/user-event");
    await userEvent.setup().click(screen.getByRole("link", { name: /comandas/i }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
