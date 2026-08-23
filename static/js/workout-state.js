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
