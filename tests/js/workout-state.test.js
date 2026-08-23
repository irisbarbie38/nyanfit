import {
  getWorkout,
  countSavedSets,
  nextPosition,
  advancePosition,
  validateSet
} from "../../static/js/workout-state.js";

function exercise(id, sets) {
  const el = document.createElement("button");
  el.dataset.exercise = id;
  el.dataset.sets = String(sets);
  return el;
}

const program = [0, 1, 2, 3, 4].map((day) => ({
  day,
  name: `Treino ${day}`,
  exercises: [
    { id: `ex-${day}`, name: `Exercício ${day}`, sets: 3 }
  ]
}));

describe("workout state", () => {
  test("mantém os cinco dias", () => {
    expect(program).toHaveLength(5);
    expect(program.map((x) => x.day)).toEqual([0, 1, 2, 3, 4]);
  });

  test("seleciona o dia correto", () => {
    expect(getWorkout(program, 3).name).toBe("Treino 3");
  });

  test("conta séries salvas por exercício", () => {
    const workout = {
      sets: [
        { exercise: "hip", set_number: 1 },
        { exercise: "hip", set_number: 2 },
        { exercise: "smith", set_number: 1 }
      ]
    };
    expect(countSavedSets(workout, "hip")).toBe(2);
    expect(countSavedSets(workout, "smith")).toBe(1);
  });

  test("retoma na primeira série ainda não salva", () => {
    const exercises = [exercise("hip", 4), exercise("smith", 3)];
    const workout = {
      sets: [
        { exercise: "hip" },
        { exercise: "hip" },
        { exercise: "hip" }
      ]
    };
    expect(nextPosition(exercises, workout))
      .toEqual({ exerciseIndex: 0, setIndex: 3 });
  });

  test("passa para o exercício seguinte ao terminar séries", () => {
    const exercises = [exercise("hip", 2), exercise("smith", 3)];
    expect(advancePosition(exercises, {
      exerciseIndex: 0,
      setIndex: 1
    })).toEqual({
      exerciseIndex: 1,
      setIndex: 0,
      complete: false
    });
  });

  test("marca treino completo depois da última série", () => {
    const exercises = [exercise("hip", 2)];
    expect(advancePosition(exercises, {
      exerciseIndex: 0,
      setIndex: 1
    })).toEqual({
      exerciseIndex: 1,
      setIndex: 0,
      complete: true
    });
  });

  test("valida peso, reps e RIR", () => {
    expect(validateSet({ weight: 100, reps: 10, rir: 1 })).toBe(true);
    expect(() => validateSet({ weight: -1, reps: 10, rir: 1 }))
      .toThrow("Peso inválido.");
    expect(() => validateSet({ weight: 100, reps: 0, rir: 1 }))
      .toThrow("Informe as repetições.");
    expect(() => validateSet({ weight: 100, reps: 10, rir: 6 }))
      .toThrow("RIR inválido.");
  });
});
