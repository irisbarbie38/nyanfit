import { api } from "./api.js";
import {
  getWorkout,
  nextPosition,
  advancePosition,
  validateSet
} from "./workout-state.js";
import {
  getPersistedSetValues,
  applySetValues,
  persistSetValues
} from "./workout-defaults.js";
import {
  getExercises,
  openModal,
  closeModal,
  renderDay,
  updateExerciseView,
  updateActiveExercise,
  getSetValues,
  getSetInputs,
  updateExerciseCount,
  showStartSetButton,
  hideStartSetButton,
  getStartSetButton,
  getCloseModalButton,
  getSaveSetButton,
  getStartWorkoutButton,
  getTimerElement,
  setProgressText
} from "./workout-ui.js";
import { createRestTimer } from "./rest-timer.js";

const program = JSON.parse(
  document.querySelector("#programData")?.textContent || "[]"
);

const userProfile = JSON.parse(
  document.querySelector("#userProfileData")?.textContent || "{}"
);

const userDefaults = JSON.parse(
  document.querySelector("#userDefaultsData")?.textContent || "{}"
);

const state = {
  workoutId: null,
  selectedDay: 0,
  exerciseIndex: 0,
  setIndex: 0,
  setActive: false
};

const restTimer = createRestTimer({
  element: getTimerElement()
});

function currentWorkout() {
  return getWorkout(
    program,
    state.selectedDay
  );
}

function calculateNextPosition(workout) {
  const position = nextPosition(
    getExercises(),
    workout
  );

  state.exerciseIndex =
    position.exerciseIndex;

  state.setIndex =
    position.setIndex;
}

function applyCurrentSetDefaults() {
  const current =
    getExercises()[state.exerciseIndex];

  if (!current) {
    return;
  }

  applySetValues(
    userDefaults,
    current.dataset.exercise,
    getSetInputs()
  );
}

function clearWorkoutState() {
  restTimer.stopRestClock();
  restTimer.resetRest();

  localStorage.removeItem(
    "nyanfit-workout"
  );

  state.workoutId = null;
  state.exerciseIndex = 0;
  state.setIndex = 0;
  state.setActive = false;
}

function renderSelectedDay(day = state.selectedDay) {
  const workout =
    renderDay(
      program,
      day,
      selectExercise
    );

  if (!workout) {
    return;
  }

  state.selectedDay =
    Number(workout.day);

  state.exerciseIndex = 0;
  state.setIndex = 0;
  state.setActive = false;

  restTimer.resetRest();
}

async function ensureWorkout() {
  if (state.workoutId) {
    try {
      const response = await api(
        `/api/workouts/${state.workoutId}`
      );

      const workout =
        await response.json();

      if (!workout.ended_at) {
        if (
          Number(workout.workout_day) !==
          Number(state.selectedDay)
        ) {
          state.selectedDay =
            Number(workout.workout_day);

          renderSelectedDay(
            state.selectedDay
          );
        }

        calculateNextPosition(
          workout
        );

        return state.workoutId;
      }
    } catch (_) {
      // Recria a sessão abaixo.
    }

    clearWorkoutState();
  }

  const current =
    currentWorkout();

  if (!current) {
    throw new Error(
      "Treino selecionado não encontrado."
    );
  }

  const response =
    await api("/api/workouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        workout_day:
          state.selectedDay,
        day:
          state.selectedDay,
        focus:
          current.name
      })
    });

  const data =
    await response.json();

  const id =
    data.id ??
    data.session_id;

  if (!id) {
    throw new Error(
      "A API não retornou o ID do treino."
    );
  }

  state.workoutId =
    Number(id);

  localStorage.setItem(
    "nyanfit-workout",
    String(state.workoutId)
  );

  return state.workoutId;
}

async function startWorkout() {
  await ensureWorkout();

  if (
    state.exerciseIndex >=
    getExercises().length
  ) {
    alert(
      "Este treino já possui todas as séries registradas."
    );
    return;
  }

  openModal();

  updateExerciseView({
    program,
    selectedDay:
      state.selectedDay,
    exerciseIndex:
      state.exerciseIndex,
    setIndex:
      state.setIndex,
    applyDefaults:
      applyCurrentSetDefaults,
    resetRest:
      restTimer.resetRest
  });
}

async function selectExercise(button) {
  const list =
    getExercises();

  const index =
    list.indexOf(button);

  if (index < 0) {
    return;
  }

  try {
    await ensureWorkout();

    state.exerciseIndex =
      index;

    const response =
      await api(
        `/api/workouts/${state.workoutId}`
      );

    const workout =
      await response.json();

    const saved =
      (workout.sets || [])
        .filter(
          (item) =>
            item.exercise ===
            button.dataset.exercise
        )
        .length;

    state.setIndex =
      Math.min(
        saved,
        Number(
          button.dataset.sets || 1
        ) - 1
      );

    openModal();

    updateExerciseView({
      program,
      selectedDay:
        state.selectedDay,
      exerciseIndex:
        state.exerciseIndex,
      setIndex:
        state.setIndex,
      applyDefaults:
        applyCurrentSetDefaults,
      resetRest:
        restTimer.resetRest
    });
  } catch (error) {
    alert(
      error.message ||
        "Não foi possível abrir o exercício."
    );
  }
}

async function startSeries() {
  if (state.setActive) {
    return;
  }

  const current =
    getExercises()[
      state.exerciseIndex
    ];

  if (!current) {
    return;
  }

  if (
    restTimer.hasActiveRest()
  ) {
    restTimer.finishRest();

    const position =
      advancePosition(
        getExercises(),
        {
          exerciseIndex:
            state.exerciseIndex,
          setIndex:
            state.setIndex
        }
      );

    if (position.complete) {
      return;
    }

    state.exerciseIndex =
      position.exerciseIndex;

    state.setIndex =
      position.setIndex;

    applyCurrentSetDefaults();
  } else {
    restTimer.renderTimer();
  }

  state.setActive = true;

  updateActiveExercise({
    program,
    selectedDay:
      state.selectedDay,
    exerciseIndex:
      state.exerciseIndex,
    setIndex:
      state.setIndex
  });

  hideStartSetButton();

  document
    .querySelector("#weight")
    ?.focus();
}

async function saveSet() {
  try {
    await ensureWorkout();

    if (!state.setActive) {
      throw new Error(
        "Inicie a série antes de salvá-la."
      );
    }

    const current =
      getExercises()[
        state.exerciseIndex
      ];

    if (!current) {
      throw new Error(
        "Exercício inválido."
      );
    }

    const total =
      Number(
        current.dataset.sets || 1
      );

    if (state.setIndex >= total) {
      throw new Error(
        "Todas as séries deste exercício já foram salvas."
      );
    }

    const values =
      getSetValues();

    validateSet(values);

    const restSeconds =
      restTimer.consumePendingRest();

    const response =
      await api(
        `/api/workouts/${state.workoutId}/sets`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            exercise:
              current.dataset.exercise,
            set_number:
              state.setIndex + 1,
            weight:
              values.weight,
            reps:
              values.reps,
            rir:
              values.rir,
            rest_seconds:
              restSeconds
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Não foi possível salvar a série."
      );
    }

    persistSetValues(
      userDefaults,
      current.dataset.exercise,
      values
    );

    updateExerciseCount(
      state.exerciseIndex,
      state.setIndex,
      total
    );

    state.setActive = false;

    if (
      data.completed ||
      data.complete
    ) {
      clearWorkoutState();

      setProgressText(
        "TREINO CONCLUÍDO"
      );

      setTimeout(
        () => location.reload(),
        250
      );

      return;
    }

    restTimer.startRestClock();

    setProgressText(
      "DESCANSO"
    );

    showStartSetButton(
      "INICIAR PRÓXIMA SÉRIE"
    );
  } catch (error) {
    alert(
      error.message ||
        "Não foi possível salvar a série."
    );
  }
}

async function restoreWorkout() {
  const saved =
    localStorage.getItem(
      "nyanfit-workout"
    );

  if (!saved) {
    return;
  }

  const id =
    Number(saved);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    clearWorkoutState();
    return;
  }

  state.workoutId =
    id;

  try {
    const response =
      await api(
        `/api/workouts/${id}`
      );

    const workout =
      await response.json();

    if (workout.ended_at) {
      clearWorkoutState();
      return;
    }

    state.selectedDay =
      Number(
        workout.workout_day
      );

    renderSelectedDay(
      state.selectedDay
    );

    calculateNextPosition(
      workout
    );
  } catch (_) {
    clearWorkoutState();
  }
}

export function getWorkoutSessionState() {
  return {
    ...state
  };
}

export function initWorkoutSession() {
  state.selectedDay =
    Number(
      document.querySelector(
        ".day-button.active"
      )?.dataset.day || 0
    );

  renderSelectedDay(
    state.selectedDay
  );

  restoreWorkout();

  getStartWorkoutButton()
    ?.addEventListener(
      "click",
      () =>
        startWorkout().catch(
          (error) =>
            alert(error.message)
        )
    );

  getCloseModalButton()
    ?.addEventListener(
      "click",
      () => {
        restTimer.stopRestClock();
        closeModal();
      }
    );

  getSaveSetButton()
    ?.addEventListener(
      "click",
      saveSet
    );

  getStartSetButton()
    ?.addEventListener(
      "click",
      startSeries
    );

  restTimer.resetRest();
}

export function getSelectedDay() {
  return state.selectedDay;
}

export function setSelectedDay(day) {
  state.selectedDay =
    Number(day);
}

export function getWorkoutId() {
  return state.workoutId;
}

export { renderSelectedDay };
