import { test, expect } from "@playwright/test";

// Só exercita a confirmação (Voltar) — não desativa de verdade, pra não deixar o serviço/
// profissional semeado inativo pra outros testes e para o uso manual do dono.
test.describe("Serviços e Profissionais", () => {
  test("desativar um serviço pede confirmação e Voltar não muda nada", async ({ page }) => {
    await page.goto("/dashboard/servicos");

    const row = page.locator("li", { has: page.getByRole("button", { name: "Desativar" }) }).first();
    await expect(row).toBeVisible();
    const serviceName = (await row.locator("p").first().innerText()).trim();

    await row.getByRole("button", { name: "Desativar" }).click();
    const confirm = page.getByRole("alertdialog", { name: "Desativar este serviço?" });
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText(serviceName);
    await confirm.getByRole("button", { name: "Voltar" }).click();
    await expect(confirm).toBeHidden();

    await expect(row.getByText("Ativo")).toBeVisible();
  });

  test("desativar um profissional pede confirmação e Voltar não muda nada", async ({ page }) => {
    await page.goto("/dashboard/profissionais");

    const row = page.locator("li", { has: page.getByRole("button", { name: "Desativar" }) }).first();
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Desativar" }).click();
    const confirm = page.getByRole("alertdialog", { name: "Desativar este profissional?" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Voltar" }).click();
    await expect(confirm).toBeHidden();

    await expect(row.getByText("Ativo")).toBeVisible();
  });
});
