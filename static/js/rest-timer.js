export function createRestTimer({ element }) {
  let restClockId = null;
  let restStartedAt = null;
  let restElapsed = 0;
  let pendingRestSeconds = 0;

  function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);

    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(
      safe % 60
    ).padStart(2, "0")}`;
  }

  function renderTimer() {
    if (element) {
      element.textContent = formatTime(restElapsed);
    }
  }

  function stopRestClock() {
    if (restClockId) {
      clearInterval(restClockId);
    }

    restClockId = null;
  }

  function currentRestSeconds() {
    if (restStartedAt === null) {
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

    return pendingRestSeconds;
  }

  function consumePendingRest() {
    const seconds = pendingRestSeconds;
    pendingRestSeconds = 0;
    return seconds;
  }

  function hasActiveRest() {
    return restStartedAt !== null;
  }

  function isRestPending() {
    return pendingRestSeconds > 0;
  }

  return {
    formatTime,
    renderTimer,
    stopRestClock,
    currentRestSeconds,
    resetRest,
    startRestClock,
    finishRest,
    consumePendingRest,
    hasActiveRest,
    isRestPending
  };
}
