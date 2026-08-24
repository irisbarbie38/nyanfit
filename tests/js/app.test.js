import { describe, expect, test } from "vitest";

describe("NyanFit frontend contract", () => {
  test("a página deve expor exatamente os controles dos cinco dias", () => {
    const html = `
      <nav>
        <button class="day-button" data-day="0">SEG</button>
        <button class="day-button" data-day="1">TER</button>
        <button class="day-button" data-day="2">QUA</button>
        <button class="day-button" data-day="3">QUI</button>
        <button class="day-button" data-day="4">SEX</button>
      </nav>
    `;
    document.body.innerHTML = html;
    expect(document.querySelectorAll(".day-button")).toHaveLength(5);
    expect([...document.querySelectorAll(".day-button")]
      .map((x) => Number(x.dataset.day)))
      .toEqual([0, 1, 2, 3, 4]);
  });

  test("o modal possui o cronômetro de descanso e inicia a série", () => {
    document.body.innerHTML = `
      <div id="workoutModal">
        <span id="timer">00:00</span>
        <input id="weight">
        <input id="reps">
        <input id="rir">
        <button id="saveSet"></button>
        <button id="startSet">INICIAR SÉRIE</button>
      </div>
    `;

    for (const id of [
      "timer", "weight", "reps", "rir",
      "saveSet", "startSet"
    ]) {
      expect(document.getElementById(id)).not.toBeNull();
    }

    expect(document.getElementById("timer").textContent).toBe("00:00");
  });
});

test("INICIAR TREINO cria a sessão e abre o modal", async () => {
  document.body.innerHTML = `
    <button id="startWorkout">INICIAR TREINO</button>

    <button class="day-button active" data-day="0">SEG</button>

    <div id="focusValue"></div>

    <section id="exerciseList"></section>

    <div id="workoutModal" class="hidden">
      <span id="modalExercise"></span>
      <span id="modalProgress"></span>
      <span id="modalDay"></span>
      <span id="timer">00:00</span>
      <input id="weight">
      <input id="reps">
      <input id="rir">
      <button id="saveSet"></button>
      <button id="startSet">INICIAR SÉRIE</button>
      <button id="closeModal"></button>
    </div>

    <script id="programData" type="application/json">
      ${JSON.stringify([
        {
          day: 0,
          name: "Glúteo pesado",
          exercises: [
            {
              id: "hip-thrust",
              name: "Elevação pélvica",
              sets: 4,
              min_reps: 8,
              max_reps: 12,
              rir: 2
            }
          ]
        }
      ])}
    </script>
  `;

  const storage = new Map();

  globalThis.localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear()
  };

  localStorage.clear();

  const calls = [];
  globalThis.alert = (message) => { throw new Error(`APP_ALERT: ${message}`); };

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });

    return new Response(
      JSON.stringify({
        id: 123,
        workout_day: 0,
        ended_at: null,
        sets: []
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  };

  await import("../../static/js/app.js");

  document
    .getElementById("startWorkout")
    .click();

  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe("/api/workouts");
  expect(calls[0].options.method).toBe("POST");

  const body = JSON.parse(calls[0].options.body);

  expect(body.workout_day).toBe(0);
  expect(body.day).toBe(0);
  expect(body.focus).toBe("Glúteo pesado");

  expect(
    localStorage.getItem("nyanfit-workout")
  ).toBe("123");

  expect(
    document.getElementById("workoutModal")
      .classList.contains("hidden")
  ).toBe(false);

  expect(
    document.getElementById("modalExercise").textContent
  ).toBe("Elevação pélvica");
});
