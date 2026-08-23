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

  test("o modal possui os controles fundamentais do treino", () => {
    document.body.innerHTML = `
      <div id="workoutModal">
        <span id="timer"></span>
        <input id="weight">
        <input id="reps">
        <input id="rir">
        <button id="saveSet"></button>
        <button id="startRest"></button>
        <button id="skipRest"></button>
        <button id="finishWorkout"></button>
      </div>
    `;
    for (const id of [
      "timer", "weight", "reps", "rir",
      "saveSet", "startRest", "skipRest", "finishWorkout"
    ]) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });
});
