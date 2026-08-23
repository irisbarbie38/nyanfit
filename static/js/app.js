let workoutId = null;
let currentExercise = null;
let currentSet = 1;
let timerId = null;
let remaining = 90;

const $ = (selector) => document.querySelector(selector);
const modal = $("#workoutModal");
const timer = $("#timer");

function fmt(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function setTimer(seconds) {
  remaining = Math.max(0, Number(seconds) || 0);
  if (timer) timer.textContent = fmt(remaining);
}

function tick() {
  setTimer(remaining);

  if (remaining <= 0) {
    clearInterval(timerId);
    timerId = null;

    if (navigator.vibrate) {
      navigator.vibrate([180, 100, 180]);
    }

    return;
  }

  remaining -= 1;
}

function startTimer() {
  clearInterval(timerId);
  setTimer(90);
  timerId = setInterval(tick, 1000);
}

function openModal() {
  modal?.classList.remove("hidden");
}

function closeModal() {
  modal?.classList.add("hidden");
  clearInterval(timerId);
  timerId = null;
}

function clearWorkoutState() {
  localStorage.removeItem("nyanfit-workout");
  workoutId = null;
  currentExercise = null;
  currentSet = 1;
}

async function api(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = `HTTP ${response.status}`;

    try {
      const body = await response.json();

      if (body.error) {
        message = body.error;
      }
    } catch (_) {}

    throw new Error(message);
  }

  return response;
}

async function startWorkout() {
  if (workoutId) {
    openModal();
    startTimer();
    return workoutId;
  }

  const response = await api("/api/workouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      focus: "Glúteo pesado"
    })
  });

  const data = await response.json();

  if (!data.id) {
    throw new Error("A API não retornou o ID do treino.");
  }

  workoutId = Number(data.id);

  localStorage.setItem(
    "nyanfit-workout",
    String(workoutId)
  );

  openModal();
  startTimer();

  return workoutId;
}

async function saveSet() {
  try {
    if (!currentExercise) {
      throw new Error("Selecione um exercício primeiro.");
    }

    await startWorkout();

    const weightInput = $("#weight");
    const repsInput = $("#reps");
    const rirInput = $("#rir");

    const weight = Number(weightInput?.value || 0);
    const reps = Number(repsInput?.value || 0);
    const rirValue = rirInput?.value ?? "";

    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error("Peso inválido.");
    }

    if (!Number.isInteger(reps) || reps <= 0) {
      throw new Error("Informe o número de repetições.");
    }

    const rir =
      rirValue === ""
        ? null
        : Number(rirValue);

    if (
      rir !== null &&
      (!Number.isInteger(rir) || rir < 0)
    ) {
      throw new Error("RIR inválido.");
    }

    await api(
      `/api/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          exercise: currentExercise,
          set_number: currentSet,
          weight,
          reps,
          rir
        })
      }
    );

    const countElements =
      document.querySelectorAll(".count");

    for (const el of countElements) {
      const exercise = el
        .closest(".exercise")
        ?.dataset.exercise;

      if (exercise !== currentExercise) {
        continue;
      }

      const parts = el.textContent
        .trim()
        .split("/")
        .map(Number);

      const done =
        Number.isFinite(parts[0])
          ? parts[0]
          : 0;

      const total =
        Number.isFinite(parts[1])
          ? parts[1]
          : done + 1;

      el.textContent =
        `${Math.min(done + 1, total)}/${total}`;

      break;
    }

    currentSet += 1;

    if (weightInput) weightInput.value = "";
    if (repsInput) repsInput.value = "";
    if (rirInput) rirInput.value = "";

    startTimer();

  } catch (error) {
    console.error(error);

    alert(
      error.message ||
      "Não foi possível salvar a série."
    );
  }
}

async function finishWorkout() {
  if (!workoutId) {
    closeModal();
    return;
  }

  try {
    await api(
      `/api/workouts/${workoutId}/finish`,
      {
        method: "POST"
      }
    );

    clearWorkoutState();
    closeModal();

    window.location.reload();

  } catch (error) {
    console.error(error);

    alert(
      error.message ||
      "Não foi possível finalizar o treino."
    );
  }
}

function selectExercise(button) {
  currentExercise =
    button.dataset.exercise || null;

  currentSet = 1;

  const title =
    button.querySelector(".exercise-title");

  const modalExercise =
    $("#modalExercise");

  if (modalExercise && title) {
    modalExercise.textContent =
      title.textContent;
  }

  startWorkout().catch((error) => {
    console.error(error);

    alert(
      error.message ||
      "Não foi possível iniciar o treino."
    );
  });
}

function restoreWorkout() {
  const saved =
    localStorage.getItem("nyanfit-workout");

  if (!saved) {
    return;
  }

  const id = Number(saved);

  if (Number.isInteger(id) && id > 0) {
    workoutId = id;
  } else {
    clearWorkoutState();
  }
}

function init() {
  restoreWorkout();

  $("#startWorkout")?.addEventListener(
    "click",
    () => {
      startWorkout().catch((error) => {
        console.error(error);

        alert(
          error.message ||
          "Não foi possível iniciar o treino."
        );
      });
    }
  );

  $("#closeModal")?.addEventListener(
    "click",
    closeModal
  );

  $("#saveSet")?.addEventListener(
    "click",
    saveSet
  );

  $("#finishWorkout")?.addEventListener(
    "click",
    finishWorkout
  );

  document
    .querySelectorAll(".exercise")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => selectExercise(button)
      );
    });
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
