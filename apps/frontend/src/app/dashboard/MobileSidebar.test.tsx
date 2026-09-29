import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileSidebar } from "./MobileSidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/agenda",
}));

describe("MobileSidebar", () => {
  it("abre o drawer ao clicar no hambúrguer e fecha com Escape", async () => {
    const user = userEvent.setup();
    render(<MobileSidebar tenant={{ name: "Salão Demo", slug: "salao-demo" }} />);

    expect(screen.queryByRole("dialog", { name: "Menu de navegação" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("dialog", { name: "Menu de navegação" })).toBeInTheDocument();
    expect(screen.getByText("Salão Demo")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Menu de navegação" })).not.toBeInTheDocument(),
    );
  });

  it("clicar num link do menu fecha o drawer", async () => {
    const user = userEvent.setup();
    render(<MobileSidebar tenant={null} />);

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    await user.click(screen.getByRole("link", { name: /comandas/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Menu de navegação" })).not.toBeInTheDocument(),
    );
  });

  it("trava o scroll do body enquanto aberto e destrava ao fechar", async () => {
    const user = userEvent.setup();
    render(<MobileSidebar tenant={null} />);

    expect(document.body.style.overflow).not.toBe("hidden");
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });
});
