export function getWorkout(program, day) {
  return program.find((workout) => Number(workout.day) === Number(day)) ?? program[0] ?? null;
}

export function countSavedSets(workout, exerciseId) {
  return (workout?.sets ?? []).filter((item) => item.exercise === exerciseId).length;
}

export function nextPosition(exercises, workout) {
  for (let i = 0; i < exercises.length; i += 1) {
    const exercise = exercises[i];
    const total = Number(exercise.dataset.sets || 1);
    const saved = countSavedSets(workout, exercise.dataset.exercise);
    if (saved < total) return { exerciseIndex: i, setIndex: saved };
  }
  return { exerciseIndex: exercises.length, setIndex: 0 };
}

export function advancePosition(exercises, position) {
  let { exerciseIndex, setIndex } = position;
  const current = exercises[exerciseIndex];
  if (!current) return { exerciseIndex, setIndex, complete: true };

  setIndex += 1;
  if (setIndex >= Number(current.dataset.sets || 1)) {
    exerciseIndex += 1;
    setIndex = 0;
  }

  return {
    exerciseIndex,
    setIndex,
    complete: exerciseIndex >= exercises.length
  };
}

export function validateSet({ weight, reps, rir }) {
  if (!Number.isFinite(weight) || weight < 0) {
    throw new Error("Peso inválido.");
  }
  if (!Number.isInteger(reps) || reps <= 0) {
    throw new Error("Informe as repetições.");
  }
  if (rir !== null && (!Number.isInteger(rir) || rir < 0 || rir > 5)) {
    throw new Error("RIR inválido.");
  }
  return true;
}

export function suggestSetDefaults({ height, weight, exercise }) {
  const minReps = Number(exercise?.min_reps) || 8;
  const maxReps = Number(exercise?.max_reps) || minReps;

  const reps = Math.round((minReps + maxReps) / 2);

  const bodyWeight = Number(weight);
  const bodyHeight = Number(height);

  let ratio = 0.1;

  if (Number.isFinite(bodyWeight) && bodyWeight > 0) {
    if (Number.isFinite(bodyHeight) && bodyHeight > 0) {
      const heightFactor = Math.max(0.75, Math.min(1.25, bodyHeight / 170));
      ratio = 0.1 * heightFactor;
    }

    const exerciseId = String(exercise?.id || "").toLowerCase();

    if (
      exerciseId.includes("hip-thrust") ||
      exerciseId.includes("hip_thrust") ||
      exerciseId.includes("glute")
    ) {
      ratio = 0.5;
    } else if (
      exerciseId.includes("squat") ||
      exerciseId.includes("smith")
    ) {
      ratio = 0.3;
    } else if (
      exerciseId.includes("deadlift") ||
      exerciseId.includes("rdl")
    ) {
      ratio = 0.35;
    } else if (
      exerciseId.includes("row") ||
      exerciseId.includes("pulldown")
    ) {
      ratio = 0.15;
    }

    const rawWeight = bodyWeight * ratio;
    const weight = Math.max(0, Math.round(rawWeight / 2.5) * 2.5);

    return { weight, reps };
  }

  return {
    weight: 0,
    reps,
  };
}
