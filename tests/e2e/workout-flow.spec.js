import { test, expect } from "@playwright/test";

const E2E_USER = `e2e-fixture-${Date.now()}`;
const E2E_PASSWORD = "password123";
const E2E_STORAGE = "test-results/e2e-user.json";

test.describe.configure({ mode: "serial" });

async function createAccount(page) {
  const username = `e2e-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const password = "password123";

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
    .fill(password);

  await page
    .locator('form[action="/register"] button')
    .click();

  await expect(page).toHaveURL(/\/profile(?:\?.*)?$/);
}

async function completeProfile(page) {
  await page.getByLabel("Altura (cm)").fill("168");
  await page.getByLabel("Peso (kg)").fill("64");

  await page
    .getByRole("button", {
      name: "SALVAR PERFIL",
    })
    .click();

  await expect(page).toHaveURL(/\/$/);
}

async function openWorkout(page) {
  await page.goto("/");

  await expect(
    page.getByRole("button", {
      name: "INICIAR TREINO",
    })
  ).toBeVisible();

  await page
    .locator('.day-button[data-day="0"]')
    .click();

  await page
    .getByRole("button", {
      name: "INICIAR TREINO",
    })
    .click();

  await expect(
    page.locator("#workoutModal")
  ).not.toHaveClass(/hidden/);
}

test.describe("fluxo principal do NyanFit", () => {
  test("cadastro exige perfil e libera o dashboard", async ({
    page,
  }) => {
    await createAccount(page);
    await completeProfile(page);

    await expect(
      page.getByRole("button", {
        name: "INICIAR TREINO",
      })
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

    await openWorkout(page);

    await expect(
      page.locator("#modalExercise")
    ).toContainText("Elevação pélvica");

    await expect(
      page.locator("#modalProgress")
    ).toHaveText("SÉRIE 1/4");

    await page
      .getByRole("button", {
        name: "INICIAR SÉRIE",
      })
      .click();

    await page.locator("#weight").fill("40");
    await page.locator("#reps").fill("10");
    await page.locator("#rir").fill("2");

    await page
      .getByRole("button", {
        name: "SALVAR SÉRIE",
      })
      .click();

    await expect(
      page.locator('.count[data-count="hip-thrust"]')
    ).toHaveText("1/4");

    await expect(
      page.locator("#modalProgress")
    ).toHaveText("DESCANSO");
  });

  test("mantém os defaults entre as séries", async ({
    page,
  }) => {
    await createAccount(page);
    await completeProfile(page);

    await openWorkout(page);

    const weight = page.locator("#weight");
    const reps = page.locator("#reps");
    const rir = page.locator("#rir");

    const defaultWeight = await weight.inputValue();
    const defaultReps = await reps.inputValue();
    const defaultRir = await rir.inputValue();

    expect(defaultWeight).not.toBe("");
    expect(defaultReps).not.toBe("");
    expect(defaultRir).not.toBe("");

    await page
      .getByRole("button", {
        name: "INICIAR SÉRIE",
      })
      .click();

    await page
      .getByRole("button", {
        name: "SALVAR SÉRIE",
      })
      .click();

    await expect(
      page.locator("#modalProgress")
    ).toHaveText("DESCANSO");

    await page
      .getByRole("button", {
        name: "INICIAR PRÓXIMA SÉRIE",
      })
      .click();

    await expect(weight).toHaveValue(defaultWeight);
    await expect(reps).toHaveValue(defaultReps);
    await expect(rir).toHaveValue(defaultRir);
  });

  test("mantém valores alterados entre as séries", async ({
    page,
  }) => {
    await createAccount(page);
    await completeProfile(page);

    await openWorkout(page);

    const weight = page.locator("#weight");
    const reps = page.locator("#reps");
    const rir = page.locator("#rir");

    await page
      .getByRole("button", {
        name: "INICIAR SÉRIE",
      })
      .click();

    await weight.fill("42.5");
    await reps.fill("10");
    await rir.fill("2");

    await page
      .getByRole("button", {
        name: "SALVAR SÉRIE",
      })
      .click();

    await expect(
      page.locator("#modalProgress")
    ).toHaveText("DESCANSO");

    await page
      .getByRole("button", {
        name: "INICIAR PRÓXIMA SÉRIE",
      })
      .click();

    await expect(weight).toHaveValue("42.5");
    await expect(reps).toHaveValue("10");
    await expect(rir).toHaveValue("2");
  });
});
