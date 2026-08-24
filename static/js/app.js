import { api } from "./api.js";
import {
  getWorkout,
  nextPosition,
  advancePosition,
  validateSet,
  suggestSetDefaults
} from "./workout-state.js";

let workoutId = null;
let selectedDay = 0;
let exerciseIndex = 0;
let setIndex = 0;
let setActive = false;

let restClockId = null;
let restStartedAt = null;
let restElapsed = 0;

/*
 * Guarda o descanso que terminou quando a usuária
 * clicou em "INICIAR PRÓXIMA SÉRIE".
 *
 * O valor só é consumido quando a próxima série
 * é salva.
 */
let pendingRestSeconds = 0;

const $ = (selector) => document.querySelector(selector);

const modal = $("#workoutModal");
const timer = $("#timer");
const modalExercise = $("#modalExercise");
const modalProgress = $("#modalProgress");
const modalDay = $("#modalDay");
const startSetButton = $("#startSet");
const program = JSON.parse($("#programData")?.textContent || "[]");
const userProfile = JSON.parse(
  $("#userProfileData")?.textContent || "{}"
);

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);

  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(
    safe % 60
  ).padStart(2, "0")}`;
}

function renderTimer() {
  if (timer) {
    timer.textContent = formatTime(restElapsed);
  }
}

function stopRestClock() {
  if (restClockId) {
    clearInterval(restClockId);
  }

  restClockId = null;
}

function currentRestSeconds() {
  if (!restStartedAt) {
    return Math.max(0, Math.floor(restElapsed));
  }

  return Math.max(
    0,
    Math.floor((Date.now() - restStartedAt) / 1000)
  );
}

function resetRest() {
  stopRestClock();

  restStartedAt = null;
  restElapsed = 0;
  pendingRestSeconds = 0;

  renderTimer();
}

function startRestClock() {
  stopRestClock();

  restStartedAt = Date.now();
  restElapsed = 0;

  renderTimer();

  restClockId = setInterval(() => {
    restElapsed = currentRestSeconds();
    renderTimer();
  }, 250);
}

function finishRest() {
  if (restStartedAt !== null) {
    restElapsed = currentRestSeconds();
  }

  pendingRestSeconds = Math.max(
    0,
    Math.floor(restElapsed)
  );

  stopRestClock();
  restStartedAt = null;

  renderTimer();
}

function openModal() {
  modal?.classList.remove("hidden");
}

function closeModal() {
  stopRestClock();
  modal?.classList.add("hidden");
}

function clearWorkoutState() {
  stopRestClock();

  localStorage.removeItem("nyanfit-workout");

  workoutId = null;
  exerciseIndex = 0;
  setIndex = 0;
  setActive = false;

  restStartedAt = null;
  restElapsed = 0;
  pendingRestSeconds = 0;
}

function currentWorkout() {
  return getWorkout(program, selectedDay);
}

function getExercises() {
  return [...document.querySelectorAll(".exercise")];
}

function iconFor(id) {
  const known = {
    "hip-thrust": "hip-thrust.png",
    smith: "smith.png",
    abduction: "abduction.png"
  };

  return known[id] || "placeholder.svg";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function renderDay() {
  const workout = currentWorkout();

  if (!workout) {
    return;
  }

  selectedDay = workout.day;

  const focus = $("#focusValue");

  if (focus) {
    focus.textContent = workout.name;
  }

  document.querySelectorAll(".day-button").forEach((button) => {
    button.classList.toggle(
      "active",
      Number(button.dataset.day) === Number(selectedDay)
    );
  });

  const list = $("#exerciseList");

  if (!list) {
    return;
  }

  list.innerHTML = workout.exercises
    .map(
      (exercise) => `
      <button
        type="button"
        class="hotspot exercise"
        data-exercise="${escapeHtml(exercise.id)}"
        data-sets="${Number(exercise.sets)}"
      >
        <img
          class="exercise-icon"
          src="/static/img/v61/${iconFor(exercise.id)}"
          alt=""
          aria-hidden="true"
          draggable="false"
        >

        <span class="exercise-title">
          ${escapeHtml(exercise.name)}
        </span>

        <span class="exercise-meta">
          ${exercise.sets} séries
          <i>•</i>
          ${exercise.min_reps}–${exercise.max_reps} reps
          <i>•</i>
          RIR ${escapeHtml(exercise.rir)}
        </span>

        <span
          class="count"
          data-count="${escapeHtml(exercise.id)}"
        >
          0/${exercise.sets}
        </span>

        <span class="exercise-arrow">›</span>
      </button>
    `
    )
    .join("");

  list.querySelectorAll(".exercise").forEach((button) => {
    button.addEventListener("click", () => {
      selectExercise(button);
    });
  });

  exerciseIndex = 0;
  setIndex = 0;
  setActive = false;

  resetRest();
}

function updateProgress() {
  const current = getExercises()[exerciseIndex];

  if (current && modalProgress) {
    modalProgress.textContent =
      `SÉRIE ${setIndex + 1}/${Number(current.dataset.sets || 1)}`;
  }
}

function updateExerciseView() {
  const list = getExercises();
  const current = list[exerciseIndex];
  const workout = currentWorkout();

  if (!current || !workout) {
    return;
  }

  const title = current.querySelector(".exercise-title");

  if (modalExercise && title) {
    modalExercise.textContent = title.textContent.trim();
  }

  if (modalDay) {
    modalDay.textContent =
      `${["SEG", "TER", "QUA", "QUI", "SEX"][workout.day]} · ` +
      `${workout.name.toUpperCase()}`;
  }

  updateProgress();

  resetRest();

  setActive = false;

  const exercise = workout.exercises[exerciseIndex];

  const defaults = suggestSetDefaults({
    height: userProfile.height,
    weight: userProfile.weight,
    exercise
  });

  const weightInput = $("#weight");
  const repsInput = $("#reps");
  const rirInput = $("#rir");

  if (weightInput) {
    weightInput.value = defaults.weight;
  }

  if (repsInput) {
    repsInput.value = defaults.reps;
  }

  if (rirInput) {
    const match = String(exercise?.rir || "").match(/\d+/);
    rirInput.value = match ? match[0] : "";
  }

  if (startSetButton) {
    startSetButton.disabled = false;
    startSetButton.textContent = "INICIAR SÉRIE";
    startSetButton.classList.remove("hidden");
  }
}

function calculateNextPosition(workout) {
  const position = nextPosition(
    getExercises(),
    workout
  );

  exerciseIndex = position.exerciseIndex;
  setIndex = position.setIndex;
}

async function ensureWorkout() {
  if (workoutId) {
    try {
      const response = await api(
        `/api/workouts/${workoutId}`
      );

      const workout = await response.json();

      if (!workout.ended_at) {
        if (
          Number(workout.workout_day) !==
          Number(selectedDay)
        ) {
          selectedDay = Number(workout.workout_day);
          renderDay();
        }

        calculateNextPosition(workout);

        return workoutId;
      }
    } catch (_) {
      // Recria a sessão abaixo.
    }

    clearWorkoutState();
  }

  const response = await api("/api/workouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      workout_day: selectedDay,
      day: selectedDay,
      focus: currentWorkout().name
    })
  });

  const data = await response.json();

  const id = data.id ?? data.session_id;

  if (!id) {
    throw new Error(
      "A API não retornou o ID do treino."
    );
  }

  workoutId = Number(id);

  localStorage.setItem(
    "nyanfit-workout",
    String(workoutId)
  );

  return workoutId;
}

async function startWorkout() {
  await ensureWorkout();

  if (exerciseIndex >= getExercises().length) {
    alert(
      "Este treino já possui todas as séries registradas."
    );
    return;
  }

  openModal();
  updateExerciseView();
}

async function selectExercise(button) {
  const list = getExercises();
  const index = list.indexOf(button);

  if (index < 0) {
    return;
  }

  try {
    await ensureWorkout();

    exerciseIndex = index;

    const response = await api(
      `/api/workouts/${workoutId}`
    );

    const workout = await response.json();

    const saved = (workout.sets || [])
      .filter(
        (item) =>
          item.exercise === button.dataset.exercise
      )
      .length;

    setIndex = Math.min(
      saved,
      Number(button.dataset.sets || 1) - 1
    );

    openModal();
    updateExerciseView();
  } catch (error) {
    alert(
      error.message ||
        "Não foi possível abrir o exercício."
    );
  }
}

function startSeries() {
  if (setActive) {
    return;
  }

  const current = getExercises()[exerciseIndex];

  if (!current) {
    return;
  }

  /*
   * Se existe um descanso em andamento, encerramos
   * esse descanso e congelamos o tempo em
   * pendingRestSeconds.
   */
  if (restStartedAt !== null) {
    finishRest();

    const position = advancePosition(
      getExercises(),
      {
        exerciseIndex,
        setIndex
      }
    );

    if (position.complete) {
      return;
    }

    exerciseIndex = position.exerciseIndex;
    setIndex = position.setIndex;
  } else {
    /*
     * Primeiro início de série:
     * não existe descanso anterior.
     */
    restElapsed = 0;
    pendingRestSeconds = 0;

    renderTimer();
  }

  setActive = true;

  const next = getExercises()[exerciseIndex];
  const workout = currentWorkout();

  if (next && workout) {
    const title =
      next.querySelector(".exercise-title");

    if (modalExercise && title) {
      modalExercise.textContent =
        title.textContent.trim();
    }

    if (modalDay) {
      modalDay.textContent =
        `${["SEG", "TER", "QUA", "QUI", "SEX"][workout.day]} · ` +
        `${workout.name.toUpperCase()}`;
    }

    updateProgress();
  }

  if (startSetButton) {
    startSetButton.classList.add("hidden");
  }

  $("#weight")?.focus();
}

async function saveSet() {
  try {
    await ensureWorkout();

    if (!setActive) {
      throw new Error(
        "Inicie a série antes de salvá-la."
      );
    }

    const current = getExercises()[exerciseIndex];

    if (!current) {
      throw new Error("Exercício inválido.");
    }

    const total = Number(
      current.dataset.sets || 1
    );

    if (setIndex >= total) {
      throw new Error(
        "Todas as séries deste exercício já foram salvas."
      );
    }

    const weight = Number(
      $("#weight")?.value || 0
    );

    const reps = Number(
      $("#reps")?.value || 0
    );

    const rawRir = $("#rir")?.value ?? "";

    const rir =
      rawRir === ""
        ? null
        : Number(rawRir);

    validateSet({
      weight,
      reps,
      rir
    });

    /*
     * Este é o descanso que acabou antes de
     * iniciar a série atual.
     *
     * Para a primeira série será 0.
     */
    const restSeconds = pendingRestSeconds;

    const response = await api(
      `/api/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          exercise: current.dataset.exercise,
          set_number: setIndex + 1,
          weight,
          reps,
          rir,
          rest_seconds: restSeconds
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Não foi possível salvar a série."
      );
    }

    const count =
      current.querySelector(".count");

    if (count) {
      count.textContent =
        `${Math.min(
          setIndex + 1,
          total
        )}/${total}`;
    }

    $("#weight").value = "";
    $("#reps").value = "";
    $("#rir").value = "";

    /*
     * O descanso que acabou foi consumido.
     */
    pendingRestSeconds = 0;

    setActive = false;

    if (
      data.completed ||
      data.complete
    ) {
      clearWorkoutState();

      if (modalProgress) {
        modalProgress.textContent =
          "TREINO CONCLUÍDO";
      }

      setTimeout(
        () => location.reload(),
        250
      );

      return;
    }

    /*
     * Agora começa o descanso entre a série
     * que acabou de ser salva e a próxima.
     */
    startRestClock();

    if (modalProgress) {
      modalProgress.textContent =
        "DESCANSO";
    }

    if (startSetButton) {
      startSetButton.textContent =
        "INICIAR PRÓXIMA SÉRIE";

      startSetButton.classList.remove(
        "hidden"
      );
    }
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

  const id = Number(saved);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    clearWorkoutState();
    return;
  }

  workoutId = id;

  try {
    const response = await api(
      `/api/workouts/${id}`
    );

    const workout = await response.json();

    if (workout.ended_at) {
      clearWorkoutState();
      return;
    }

    selectedDay =
      Number(workout.workout_day);

    renderDay();

    calculateNextPosition(workout);
  } catch (_) {
    clearWorkoutState();
  }
}

function init() {
  selectedDay = Number(
    document.querySelector(
      ".day-button.active"
    )?.dataset.day || 0
  );

  document
    .querySelectorAll(".day-button")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          if (workoutId) {
            alert(
              "Finalize o treino atual antes de trocar o dia."
            );
            return;
          }

          selectedDay =
            Number(button.dataset.day);

          renderDay();
        }
      );
    });

  renderDay();
  restoreWorkout();

  $("#startWorkout")?.addEventListener(
    "click",
    () =>
      startWorkout().catch((error) =>
        alert(error.message)
      )
  );

  $("#closeModal")?.addEventListener(
    "click",
    closeModal
  );

  $("#saveSet")?.addEventListener(
    "click",
    saveSet
  );

  startSetButton?.addEventListener(
    "click",
    startSeries
  );

  $("#navWorkouts")?.addEventListener(
    "click",
    () =>
      document
        .querySelector(".week-picker")
        ?.scrollIntoView?.()
  );

  $("#navHistory")?.addEventListener(
    "click",
    () => {
      location.hash = "history";
    }
  );

  $("#navProgress")?.addEventListener(
    "click",
    () =>
      alert(
        "Progressão disponível pela API /api/progression."
      )
  );

  $("#navProfile")?.addEventListener(
    "click",
    () => {
      location.href = "/profile";
    }
  );

  resetRest();
}

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    init,
    { once: true }
  );
} else {
  init();
}
