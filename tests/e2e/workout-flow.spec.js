import { test, expect } from "@playwright/test";

function uniqueUser() {
  return `e2e-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

async function createAccount(page) {
  const username = uniqueUser();
  const password = "password123";

  await page.goto("/login");

  await page.locator("summary").filter({ hasText: "Criar conta" }).click();

  await page
    .locator('form[action="/register"] input[name="username"]')
    .fill(username);

  await page
    .locator('form[action="/register"] input[name="password"]')
    .fill(password);

  await page
    .locator('form[action="/register"] button')
    .click();

  await expect(page).toHaveURL(/\/profile(?:\?.*)?$/);

  return { username, password };
}

async function completeProfile(page) {
  await page.getByLabel("Altura (cm)").fill("168");
  await page.getByLabel("Peso (kg)").fill("64");

  await page.getByRole("button", {
    name: "SALVAR PERFIL",
  }).click();

  await expect(page).toHaveURL(/\/$/);
}

test.describe("fluxo principal do NyanFit", () => {
  test("cadastro exige perfil e libera o dashboard", async ({
    page,
  }) => {
    await createAccount(page);
    await completeProfile(page);

    await expect(
      page.getByRole("button", { name: "INICIAR TREINO" })
    ).toBeVisible();

    await expect(
      page.locator(".day-button")
    ).toHaveCount(5);
  });

  test("os cinco dias do programa funcionam na interface", async ({
    page,
  }) => {
    await createAccount(page);
    await completeProfile(page);

    const days = page.locator(".day-button");

    await expect(days).toHaveCount(5);

    for (let day = 0; day < 5; day++) {
      await expect(
        page.locator(`.day-button[data-day="${day}"]`)
      ).toBeVisible();
    }

    await page
      .locator('.day-button[data-day="4"]')
      .click();

    await expect(
      page.locator("#focusValue")
    ).toHaveText("Glúteo + posterior");

    await expect(
      page.locator("#exerciseList .exercise")
    ).toHaveCount(3);
  });

  test("inicia treino e registra a primeira série", async ({
    page,
  }) => {
    await createAccount(page);
    await completeProfile(page);

    await page
      .locator('.day-button[data-day="0"]')
      .click();

    await page
      .getByRole("button", { name: "INICIAR TREINO" })
      .click();

    await expect(
      page.locator("#workoutModal")
    ).not.toHaveClass(/hidden/);

    await expect(
      page.locator("#modalExercise")
    ).toContainText("Elevação pélvica");

    await expect(
      page.locator("#modalProgress")
    ).toHaveText("SÉRIE 1/4");

    await page
      .getByRole("button", { name: "INICIAR SÉRIE" })
      .click();

    await page.locator("#weight").fill("40");
    await page.locator("#reps").fill("10");
    await page.locator("#rir").fill("2");

    await page
      .getByRole("button", { name: "SALVAR SÉRIE" })
      .click();

    await expect(
      page.locator('.count[data-count="hip-thrust"]')
    ).toHaveText("1/4");

    await expect(
      page.locator("#modalProgress")
    ).toHaveText("DESCANSO");
  });
});
