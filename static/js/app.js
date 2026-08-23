import { api } from "./api.js";
import {
  getWorkout,
  nextPosition,
  advancePosition,
  validateSet
} from "./workout-state.js";

let workoutId = null;
let selectedDay = 0;
let exerciseIndex = 0;
let setIndex = 0;
let restTimerId = null;
let restRemaining = 90;

const $ = (selector) => document.querySelector(selector);
const modal = $("#workoutModal");
const timer = $("#timer");
const modalExercise = $("#modalExercise");
const modalProgress = $("#modalProgress");
const modalDay = $("#modalDay");
const startRestButton = $("#startRest");
const skipRestButton = $("#skipRest");
const program = JSON.parse($("#programData")?.textContent || "[]");

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function renderTimer() {
  if (timer) timer.textContent = formatTime(restRemaining);
}

function stopRest() {
  clearInterval(restTimerId);
  restTimerId = null;
}

function resetRest() {
  stopRest();
  restRemaining = 90;
  renderTimer();
  if (startRestButton) {
    startRestButton.disabled = false;
    startRestButton.textContent = "INICIAR DESCANSO";
  }
  startRestButton?.classList.add("hidden");
  skipRestButton?.classList.add("hidden");
}

function openModal() {
  modal?.classList.remove("hidden");
}

function closeModal() {
  stopRest();
  modal?.classList.add("hidden");
}

function clearWorkoutState() {
  localStorage.removeItem("nyanfit-workout");
  workoutId = null;
  exerciseIndex = 0;
  setIndex = 0;
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
  if (!workout) return;

  selectedDay = workout.day;
  const focus = $("#focusValue");
  if (focus) focus.textContent = workout.name;

  document.querySelectorAll(".day-button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.day) === Number(selectedDay));
  });

  const list = $("#exerciseList");
  if (!list) return;

  list.innerHTML = workout.exercises.map((exercise) => `
    <button type="button" class="hotspot exercise"
            data-exercise="${escapeHtml(exercise.id)}"
            data-sets="${Number(exercise.sets)}">
      <img class="exercise-icon"
           src="/static/img/v61/${iconFor(exercise.id)}"
           alt="" aria-hidden="true" draggable="false">
      <span class="exercise-title">${escapeHtml(exercise.name)}</span>
      <span class="exercise-meta">${exercise.sets} séries <i>•</i>
        ${exercise.min_reps}–${exercise.max_reps} reps <i>•</i> RIR ${escapeHtml(exercise.rir)}</span>
      <span class="count" data-count="${escapeHtml(exercise.id)}">0/${exercise.sets}</span>
      <span class="exercise-arrow">›</span>
    </button>
  `).join("");

  list.querySelectorAll(".exercise").forEach((button) => {
    button.addEventListener("click", () => selectExercise(button));
  });

  exerciseIndex = 0;
  setIndex = 0;
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
  if (!current || !workout) return;

  const title = current.querySelector(".exercise-title");
  if (modalExercise && title) modalExercise.textContent = title.textContent.trim();

  if (modalDay) {
    modalDay.textContent =
      `${["SEG", "TER", "QUA", "QUI", "SEX"][workout.day]} · ${workout.name.toUpperCase()}`;
  }

  updateProgress();
  resetRest();

  ["#weight", "#reps", "#rir"].forEach((selector) => {
    const element = $(selector);
    if (element) element.value = "";
  });
}

function calculateNextPosition(workout) {
  const position = nextPosition(getExercises(), workout);
  exerciseIndex = position.exerciseIndex;
  setIndex = position.setIndex;
}

async function ensureWorkout() {
  if (workoutId) {
    try {
      const workout = await (await api(`/api/workouts/${workoutId}`)).json();
      if (!workout.ended_at) {
        if (Number(workout.workout_day) !== Number(selectedDay)) {
          selectedDay = Number(workout.workout_day);
          renderDay();
        }
        calculateNextPosition(workout);
        return workoutId;
      }
    } catch (_) {}
    clearWorkoutState();
  }

  const response = await api("/api/workouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workout_day: selectedDay,
      day: selectedDay,
      focus: currentWorkout().name
    })
  });

  const data = await response.json();
  const id = data.id ?? data.session_id;
  if (!id) throw new Error("A API não retornou o ID do treino.");

  workoutId = Number(id);
  localStorage.setItem("nyanfit-workout", String(workoutId));
  return workoutId;
}

async function startWorkout() {
  await ensureWorkout();
  if (exerciseIndex >= getExercises().length) {
    alert("Este treino já possui todas as séries registradas.");
    return;
  }
  openModal();
  updateExerciseView();
}

async function selectExercise(button) {
  const list = getExercises();
  const index = list.indexOf(button);
  if (index < 0) return;

  try {
    await ensureWorkout();
    exerciseIndex = index;

    const workout = await (await api(`/api/workouts/${workoutId}`)).json();
    const saved = (workout.sets || [])
      .filter((item) => item.exercise === button.dataset.exercise).length;

    setIndex = Math.min(
      saved,
      Number(button.dataset.sets || 1) - 1
    );

    openModal();
    updateExerciseView();
  } catch (error) {
    alert(error.message || "Não foi possível abrir o exercício.");
  }
}

async function saveSet() {
  try {
    await ensureWorkout();

    const current = getExercises()[exerciseIndex];
    if (!current) throw new Error("Exercício inválido.");

    const total = Number(current.dataset.sets || 1);
    if (setIndex >= total) {
      throw new Error("Todas as séries deste exercício já foram salvas.");
    }

    const weight = Number($("#weight")?.value || 0);
    const reps = Number($("#reps")?.value || 0);
    const rawRir = $("#rir")?.value ?? "";
    const rir = rawRir === "" ? null : Number(rawRir);

    validateSet({ weight, reps, rir });

    await api(`/api/workouts/${workoutId}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise: current.dataset.exercise,
        set_number: setIndex + 1,
        weight,
        reps,
        rir
      })
    });

    const count = current.querySelector(".count");
    if (count) count.textContent = `${Math.min(setIndex + 1, total)}/${total}`;

    $("#weight").value = "";
    $("#reps").value = "";
    $("#rir").value = "";

    startRestButton?.classList.remove("hidden");
    skipRestButton?.classList.remove("hidden");

    if (modalProgress) modalProgress.textContent = "SÉRIE SALVA · DESCANSO";
  } catch (error) {
    alert(error.message || "Não foi possível salvar a série.");
  }
}

function advanceAfterRest() {
  const position = advancePosition(getExercises(), {
    exerciseIndex,
    setIndex
  });

  resetRest();
  exerciseIndex = position.exerciseIndex;
  setIndex = position.setIndex;

  if (position.complete) {
    if (modalProgress) modalProgress.textContent = "TREINO CONCLUÍDO";
    return;
  }

  updateExerciseView();
}

function startRest() {
  if (restTimerId) return;

  restRemaining = 90;
  renderTimer();

  if (startRestButton) {
    startRestButton.disabled = true;
    startRestButton.textContent = "DESCANSANDO...";
  }

  restTimerId = setInterval(() => {
    restRemaining -= 1;
    renderTimer();

    if (restRemaining <= 0) {
      stopRest();
      navigator.vibrate?.([180, 100, 180]);
      advanceAfterRest();
    }
  }, 1000);
}

function skipRest() {
  advanceAfterRest();
}

async function finishWorkout() {
  if (!workoutId) {
    closeModal();
    return;
  }

  try {
    await api(`/api/workouts/${workoutId}/finish`, { method: "POST" });
    clearWorkoutState();
    closeModal();
    location.reload();
  } catch (error) {
    alert(error.message || "Não foi possível finalizar o treino.");
  }
}

async function restoreWorkout() {
  const saved = localStorage.getItem("nyanfit-workout");
  if (!saved) return;

  const id = Number(saved);
  if (!Number.isInteger(id) || id <= 0) {
    clearWorkoutState();
    return;
  }

  workoutId = id;

  try {
    const workout = await (await api(`/api/workouts/${id}`)).json();

    if (workout.ended_at) {
      clearWorkoutState();
      return;
    }

    selectedDay = Number(workout.workout_day);
    renderDay();
    calculateNextPosition(workout);
  } catch (_) {
    clearWorkoutState();
  }
}

function init() {
  selectedDay = Number(
    document.querySelector(".day-button.active")?.dataset.day || 0
  );

  document.querySelectorAll(".day-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (workoutId) {
        alert("Finalize o treino atual antes de trocar o dia.");
        return;
      }
      selectedDay = Number(button.dataset.day);
      renderDay();
    });
  });

  restoreWorkout();

  $("#startWorkout")?.addEventListener("click", () =>
    startWorkout().catch((error) => alert(error.message))
  );
  $("#closeModal")?.addEventListener("click", closeModal);
  $("#saveSet")?.addEventListener("click", saveSet);
  startRestButton?.addEventListener("click", startRest);
  skipRestButton?.addEventListener("click", skipRest);
  $("#finishWorkout")?.addEventListener("click", finishWorkout);

  $("#navWorkouts")?.addEventListener(
    "click",
    () => document.querySelector(".week-picker")?.scrollIntoView?.()
  );
  $("#navHistory")?.addEventListener(
    "click",
    () => (location.hash = "history")
  );
  $("#navProgress")?.addEventListener(
    "click",
    () => alert("Progressão disponível pela API /api/progression.")
  );
  $("#navProfile")?.addEventListener(
    "click",
    () => (location.href = "/logout")
  );

  resetRest();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
