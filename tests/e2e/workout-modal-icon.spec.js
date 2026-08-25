import { test, expect } from "@playwright/test";

async function createAccount(page) {
  const username = `icon-e2e-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  await page.goto("/login");

  await page
    .locator("summary")
    .filter({ hasText: "Criar conta" })
    .click();

  await page
    .locator('form[action="/register"] input[name="username"]')
    .fill(username);

  await page
    .locator('form[action="/register"] input[name="password"]')
    .fill("password123");

  await page
    .locator('form[action="/register"] button')
    .click();

  await expect(page).toHaveURL(/\/profile(?:\?.*)?$/);

  await page.getByLabel("Altura (cm)").fill("168");
  await page.getByLabel("Peso (kg)").fill("64");

  await page
    .getByRole("button", { name: "SALVAR PERFIL" })
    .click();

  await expect(page).toHaveURL(/\/$/);
}

test("ícone do modal acompanha o exercício selecionado", async ({
  page,
}) => {
  await createAccount(page);

  await page.goto("/");

  await page
    .locator('.day-button[data-day="0"]')
    .click();

  const exercises = page.locator("#exerciseList .exercise");

  await expect(exercises).toHaveCount(3);

  const firstExercise = exercises.nth(0);

  const firstId =
    await firstExercise.getAttribute("data-exercise");

  const firstListIcon =
    await firstExercise
      .locator(".exercise-icon")
      .getAttribute("src");

  expect(firstId).toBeTruthy();
  expect(firstListIcon).toBeTruthy();
  expect(firstListIcon).not.toContain("placeholder.svg");

  await firstExercise.click();

  await expect(page.locator("#workoutModal"))
    .not.toHaveClass(/hidden/);

  const firstModalIcon =
    await page
      .locator("#modalExerciseIcon")
      .getAttribute("src");

  expect(firstModalIcon).toBe(firstListIcon);
  expect(firstModalIcon).not.toContain("placeholder.svg");

  /*
   * Fecha o modal antes de selecionar outro exercício.
   */
  await page.locator("#closeModal").click();

  await expect(page.locator("#workoutModal"))
    .toHaveClass(/hidden/);

  const secondExercise = exercises.nth(1);

  const secondId =
    await secondExercise.getAttribute("data-exercise");

  const secondListIcon =
    await secondExercise
      .locator(".exercise-icon")
      .getAttribute("src");

  expect(secondId).toBeTruthy();
  expect(secondId).not.toBe(firstId);

  expect(secondListIcon).toBeTruthy();
  expect(secondListIcon).not.toContain("placeholder.svg");

  await secondExercise.click();

  await expect(page.locator("#workoutModal"))
    .not.toHaveClass(/hidden/);

  const secondModalIcon =
    await page
      .locator("#modalExerciseIcon")
      .getAttribute("src");

  expect(secondModalIcon).toBe(secondListIcon);
  expect(secondModalIcon).not.toBe(firstModalIcon);
  expect(secondModalIcon).not.toContain("placeholder.svg");
});
