let workoutId = null;
let currentExercise = null;
let currentSet = 1;
let timerId = null;
let remaining = 90;

const $ = (selector) => document.querySelector(selector);

const modal = $("#workoutModal");
const timer = $("#timer");

function fmt(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60
  ).padStart(2, "0")}`;
}

function setTimer(seconds) {
  remaining = Math.max(0, Number(seconds) || 0);

  if (timer) {
    timer.textContent = fmt(remaining);
  }
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
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeModal() {
  if (modal) {
    modal.classList.add("hidden");
  }

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
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;

    try {
      const body = await response.json();

      if (body.error) {
        message = body.error;

        if (body.detail) {
          message += `: ${body.detail}`;
        }
      }
    } catch (_) {
      const text = await response.text();

      if (text) {
        console.error("Resposta não-JSON:", text);
      }
    }

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
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      focus: "Glúteo pesado",
    }),
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
      (!Number.isInteger(rir) || rir < 0 || rir > 5)
    ) {
      throw new Error("RIR inválido.");
    }

    await api(
      `/api/workouts/${workoutId}/sets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exercise: currentExercise,
          set_number: currentSet,
          weight,
          reps,
          rir,
        }),
      }
    );

    const countElements =
      document.querySelectorAll(".count");

    for (const el of countElements) {
      const exercise =
        el.closest(".exercise")?.dataset.exercise;

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
    console.error("saveSet:", error);

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
        method: "POST",
      }
    );

    clearWorkoutState();
    closeModal();

    window.location.reload();

  } catch (error) {
    console.error("finishWorkout:", error);

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
      title.textContent.trim();
  }

  startWorkout().catch((error) => {
    console.error("selectExercise:", error);

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

  const startButton = $("#startWorkout");

  if (startButton) {
    startButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        startWorkout().catch((error) => {
          console.error("startWorkout:", error);

          alert(
            error.message ||
            "Não foi possível iniciar o treino."
          );
        });
      }
    );
  }

  const closeButton = $("#closeModal");

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        closeModal();
      }
    );
  }

  const saveButton = $("#saveSet");

  if (saveButton) {
    saveButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        saveSet();
      }
    );
  }

  const finishButton = $("#finishWorkout");

  if (finishButton) {
    finishButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        finishWorkout();
      }
    );
  }

  document
    .querySelectorAll(".exercise")
    .forEach((button) => {
      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          selectExercise(button);
        }
      );
    });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    init,
    { once: true }
  );
} else {
  init();
}
