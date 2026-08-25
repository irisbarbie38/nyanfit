export function getPersistedSetValues(userDefaults, exerciseId) {
  const defaults = userDefaults?.[exerciseId];

  if (!defaults) {
    return null;
  }

  return {
    weight: defaults.weight ?? "",
    reps: defaults.reps ?? "",
    rir:
      defaults.rir === null || defaults.rir === undefined
        ? ""
        : defaults.rir
  };
}

export function applySetValues(userDefaults, exerciseId, elements) {
  const values = getPersistedSetValues(
    userDefaults,
    exerciseId
  );

  if (!values) {
    console.warn(
      "Default não encontrado no banco:",
      exerciseId
    );

    return false;
  }

  if (elements?.weight) {
    elements.weight.value = values.weight;
  }

  if (elements?.reps) {
    elements.reps.value = values.reps;
  }

  if (elements?.rir) {
    elements.rir.value = values.rir;
  }

  return true;
}

export function persistSetValues(userDefaults, exerciseId, values) {
  userDefaults[exerciseId] = {
    weight: values.weight,
    reps: values.reps,
    rir: values.rir
  };
}
