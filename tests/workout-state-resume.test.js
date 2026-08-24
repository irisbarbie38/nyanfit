import { describe, expect, test } from "vitest";
import {
  countSavedSets,
  nextPosition,
} from "../static/js/workout-state.js";


function exercise(id, sets) {
  return {
    dataset: {
      exercise: id,
      sets: String(sets),
    },
  };
}


describe("workout-state resume", () => {
  test("retoma no segundo exercício quando o primeiro está completo", () => {
    const exercises = [
      exercise("hip-thrust", 4),
      exercise("smith", 3),
      exercise("abduction", 3),
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


  test("retoma exatamente na série seguinte após várias séries salvas", () => {
    const exercises = [
      exercise("hip-thrust", 4),
      exercise("smith", 3),
    ];

    const workout = {
      sets: [
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },
      ],
    };

    expect(
      countSavedSets(workout, "hip-thrust"),
    ).toBe(2);

    expect(nextPosition(exercises, workout)).toEqual({
      exerciseIndex: 0,
      setIndex: 2,
    });
  });


  test("não volta para exercício já completamente concluído", () => {
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
        { exercise: "smith" },
        { exercise: "smith" },
      ],
    };

    expect(nextPosition(exercises, workout)).toEqual({
      exerciseIndex: 2,
      setIndex: 0,
    });
  });


  test("retoma no terceiro exercício depois dos dois primeiros completos", () => {
    const exercises = [
      exercise("hip-thrust", 4),
      exercise("smith", 3),
      exercise("abduction", 3),
    ];

    const workout = {
      sets: [
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },

        { exercise: "smith" },
        { exercise: "smith" },
        { exercise: "smith" },

        { exercise: "abduction" },
      ],
    };

    expect(nextPosition(exercises, workout)).toEqual({
      exerciseIndex: 2,
      setIndex: 1,
    });
  });


  test("retoma corretamente quando não há nenhuma série salva", () => {
    const exercises = [
      exercise("hip-thrust", 4),
      exercise("smith", 3),
    ];

    expect(
      nextPosition(exercises, { sets: [] }),
    ).toEqual({
      exerciseIndex: 0,
      setIndex: 0,
    });
  });


  test("considera o treino concluído somente quando todas as séries estão salvas", () => {
    const exercises = [
      exercise("hip-thrust", 2),
      exercise("smith", 2),
    ];

    const incompleteWorkout = {
      sets: [
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },
        { exercise: "smith" },
      ],
    };

    expect(
      nextPosition(exercises, incompleteWorkout),
    ).toEqual({
      exerciseIndex: 1,
      setIndex: 1,
    });


    const completeWorkout = {
      sets: [
        { exercise: "hip-thrust" },
        { exercise: "hip-thrust" },
        { exercise: "smith" },
        { exercise: "smith" },
      ],
    };

    expect(
      nextPosition(exercises, completeWorkout),
    ).toEqual({
      exerciseIndex: 2,
      setIndex: 0,
    });
  });
});
