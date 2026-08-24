import { describe, expect, test } from "vitest";
import {
  getWorkout,
  countSavedSets,
  nextPosition,
  advancePosition,
  validateSet,
  suggestSetDefaults,
} from "../static/js/workout-state.js";

const program = [
  {
    day: 0,
    name: "Glúteo pesado",
    exercises: [
      { id: "hip-thrust", sets: 4, min_reps: 8, max_reps: 12 },
      { id: "smith", sets: 3, min_reps: 8, max_reps: 12 },
    ],
  },
  {
    day: 1,
    name: "Posterior + glúteo",
    exercises: [
      { id: "rdl", sets: 3, min_reps: 8, max_reps: 10 },
    ],
  },
  {
    day: 2,
    name: "Quadríceps",
    exercises: [
      { id: "squat", sets: 4, min_reps: 8, max_reps: 12 },
    ],
  },
  {
    day: 3,
    name: "Superior",
    exercises: [
      { id: "row", sets: 3, min_reps: 8, max_reps: 12 },
    ],
  },
  {
    day: 4,
    name: "Full body",
    exercises: [
      { id: "deadlift", sets: 3, min_reps: 6, max_reps: 10 },
    ],
  },
];

function exercise(id, sets) {
  return {
    dataset: {
      exercise: id,
      sets: String(sets),
    },
  };
}

describe("workout-state", () => {
  test("seleciona corretamente cada um dos cinco dias", () => {
    for (let day = 0; day < 5; day += 1) {
      expect(getWorkout(program, day).day).toBe(day);
    }
  });

  test("faz fallback para o primeiro treino quando o dia não existe", () => {
    expect(getWorkout(program, 99)).toBe(program[0]);
  });

  test("conta somente as séries do exercício solicitado", () => {
    const workout = {
      sets: [
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },
        { exercise: "smith" },
      ],
    };

    expect(countSavedSets(workout, "hip-thrust")).toBe(2);
    expect(countSavedSets(workout, "smith")).toBe(1);
    expect(countSavedSets(workout, "rdl")).toBe(0);
  });

  test("encontra o primeiro exercício que ainda possui séries pendentes", () => {
    const exercises = [
      exercise("hip-thrust", 4),
      exercise("smith", 3),
    ];

    const workout = {
      sets: [
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },
        { exercise: "smith" },
      ],
    };

    expect(nextPosition(exercises, workout)).toEqual({
      exerciseIndex: 1,
      setIndex: 1,
    });
  });

  test("detecta treino completamente concluído", () => {
    const exercises = [
      exercise("hip-thrust", 2),
      exercise("smith", 1),
    ];

    const workout = {
      sets: [
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },
        { exercise: "smith" },
      ],
    };

    expect(nextPosition(exercises, workout)).toEqual({
      exerciseIndex: exercises.length,
      setIndex: 0,
    });
  });

  test("avança para a próxima série do mesmo exercício", () => {
    const exercises = [
      exercise("hip-thrust", 4),
      exercise("smith", 3),
    ];

    expect(
      advancePosition(exercises, {
        exerciseIndex: 0,
        setIndex: 0,
      }),
    ).toEqual({
      exerciseIndex: 0,
      setIndex: 1,
      complete: false,
    });
  });

  test("avança para o próximo exercício ao terminar as séries", () => {
    const exercises = [
      exercise("hip-thrust", 2),
      exercise("smith", 3),
    ];

    expect(
      advancePosition(exercises, {
        exerciseIndex: 0,
        setIndex: 1,
      }),
    ).toEqual({
      exerciseIndex: 1,
      setIndex: 0,
      complete: false,
    });
  });

  test("marca automaticamente o treino como concluído na última série", () => {
    const exercises = [
      exercise("hip-thrust", 2),
      exercise("smith", 1),
    ];

    expect(
      advancePosition(exercises, {
        exerciseIndex: 1,
        setIndex: 0,
      }),
    ).toEqual({
      exerciseIndex: 2,
      setIndex: 0,
      complete: true,
    });
  });

  test("aceita peso zero", () => {
    expect(
      validateSet({
        weight: 0,
        reps: 10,
        rir: 2,
      }),
    ).toBe(true);
  });

  test("rejeita peso negativo", () => {
    expect(() =>
      validateSet({
        weight: -1,
        reps: 10,
        rir: 2,
      }),
    ).toThrow("Peso inválido.");
  });

  test("rejeita repetições inválidas", () => {
    expect(() =>
      validateSet({
        weight: 20,
        reps: 0,
        rir: 2,
      }),
    ).toThrow("Informe as repetições.");
  });

  test("aceita RIR nulo", () => {
    expect(
      validateSet({
        weight: 20,
        reps: 10,
        rir: null,
      }),
    ).toBe(true);
  });

  test("sugere peso e repetições a partir do biotipo", () => {
    const defaults = suggestSetDefaults({
      height: 170,
      weight: 65,
      exercise: {
        id: "hip-thrust",
        min_reps: 8,
        max_reps: 12,
      },
    });

    expect(defaults).toEqual(
      expect.objectContaining({
        reps: expect.any(Number),
        weight: expect.any(Number),
      }),
    );

    expect(defaults.reps).toBeGreaterThanOrEqual(8);
    expect(defaults.reps).toBeLessThanOrEqual(12);
    expect(defaults.weight).toBeGreaterThanOrEqual(0);
  });

  test("permite gerar sugestão sem obrigar dados de biotipo", () => {
    const defaults = suggestSetDefaults({
      height: null,
      weight: null,
      exercise: {
        id: "hip-thrust",
        min_reps: 8,
        max_reps: 12,
      },
    });

    expect(defaults).toEqual(
      expect.objectContaining({
        reps: expect.any(Number),
        weight: expect.any(Number),
      }),
    );
  });
});
