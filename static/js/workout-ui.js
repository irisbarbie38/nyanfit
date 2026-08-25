const $ = (selector) => document.querySelector(selector);

const modal = $("#workoutModal");
const modalExercise = $("#modalExercise");
const modalProgress = $("#modalProgress");
const modalDay = $("#modalDay");
const startSetButton = $("#startSet");

export function getExercises() {
  return [...document.querySelectorAll(".exercise")];
}

export function iconFor(id) {
  const known = {
    "hip-thrust": "hip-thrust.png",
    "smith": "smith.png",
    "abduction": "abduction.png",
    "stiff": "stiff.png",
    "leg-curl": "leg-curl.png",
    "cable-kickback": "cable-kickback.png",
    "bulgarian": "bulgarian.png",
    "leg-press": "leg-press.png",
    "cable-hip": "cable-hip.png",
    "pallof": "pallof.png",
    "reverse-lunge": "reverse-lunge.png",
    "seated-curl": "seated-curl.png"
  };

  return known[id] || "placeholder.svg";
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

export function openModal() {
  modal?.classList.remove("hidden");
}

export function closeModal() {
  modal?.classList.add("hidden");
}

export function updateProgress(exerciseIndex, setIndex) {
  const current = getExercises()[exerciseIndex];

  if (current && modalProgress) {
    modalProgress.textContent =
      `SÉRIE ${setIndex + 1}/${Number(current.dataset.sets || 1)}`;
  }
}

export function renderDay(
  program,
  selectedDay,
  onExerciseSelect
) {
  const workout =
    program.find(
      (item) =>
        Number(item.day) === Number(selectedDay)
    ) ??
    program[0] ??
    null;

  if (!workout) {
    return null;
  }

  const focus = $("#focusValue");

  if (focus) {
    focus.textContent = workout.name;
  }

  document.querySelectorAll(".day-button").forEach((button) => {
    button.classList.toggle(
      "active",
      Number(button.dataset.day) === Number(workout.day)
    );
  });

  const list = $("#exerciseList");

  if (!list) {
    return workout;
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
      onExerciseSelect?.(button);
    });
  });

  return workout;
}

export function updateExerciseView({
  program,
  selectedDay,
  exerciseIndex,
  setIndex,
  applyDefaults,
  resetRest
}) {
  const list = getExercises();
  const current = list[exerciseIndex];

  const workout =
    program.find(
      (item) =>
        Number(item.day) === Number(selectedDay)
    ) ??
    program[0] ??
    null;

  if (!current || !workout) {
    return;
  }

  const title =
    current.querySelector(".exercise-title");

  if (modalExercise && title) {
    modalExercise.textContent =
      title.textContent.trim();
  }

  if (modalDay) {
    modalDay.textContent =
      `${["SEG", "TER", "QUA", "QUI", "SEX"][workout.day]} · ` +
      `${workout.name.toUpperCase()}`;
  }

  updateProgress(
    exerciseIndex,
    setIndex
  );

  resetRest?.();

  applyDefaults?.();

  if (startSetButton) {
    startSetButton.disabled = false;
    startSetButton.textContent = "INICIAR SÉRIE";
    startSetButton.classList.remove("hidden");
  }
}

export function updateActiveExercise({
  program,
  selectedDay,
  exerciseIndex,
  setIndex
}) {
  const current =
    getExercises()[exerciseIndex];

  if (!current) {
    return;
  }

  const workout =
    program.find(
      (item) =>
        Number(item.day) === Number(selectedDay)
    ) ??
    program[0] ??
    null;

  if (!workout) {
    return;
  }

  const title =
    current.querySelector(".exercise-title");

  if (modalExercise && title) {
    modalExercise.textContent =
      title.textContent.trim();
  }

  if (modalDay) {
    modalDay.textContent =
      `${["SEG", "TER", "QUA", "QUI", "SEX"][workout.day]} · ` +
      `${workout.name.toUpperCase()}`;
  }

  updateProgress(
    exerciseIndex,
    setIndex
  );
}

export function getSetValues() {
  const weight = Number(
    $("#weight")?.value || 0
  );

  const reps = Number(
    $("#reps")?.value || 0
  );

  const rawRir =
    $("#rir")?.value ?? "";

  const rir =
    rawRir === ""
      ? null
      : Number(rawRir);

  return {
    weight,
    reps,
    rir
  };
}

export function getSetInputs() {
  return {
    weight: $("#weight"),
    reps: $("#reps"),
    rir: $("#rir")
  };
}

export function updateExerciseCount(
  exerciseIndex,
  setIndex,
  total
) {
  const current =
    getExercises()[exerciseIndex];

  if (!current) {
    return;
  }

  const count =
    current.querySelector(".count");

  if (count) {
    count.textContent =
      `${Math.min(setIndex + 1, total)}/${total}`;
  }
}

export function showStartSetButton(text = "INICIAR SÉRIE") {
  if (!startSetButton) {
    return;
  }

  startSetButton.textContent = text;
  startSetButton.classList.remove("hidden");
}

export function hideStartSetButton() {
  startSetButton?.classList.add("hidden");
}

export function getStartSetButton() {
  return startSetButton;
}

export function getCloseModalButton() {
  return $("#closeModal");
}

export function getSaveSetButton() {
  return $("#saveSet");
}

export function getStartWorkoutButton() {
  return $("#startWorkout");
}

export function getTimerElement() {
  return $("#timer");
}

export function setProgressText(text) {
  if (modalProgress) {
    modalProgress.textContent = text;
  }
}
