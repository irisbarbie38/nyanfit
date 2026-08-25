import {
  initWorkoutSession,
  getWorkoutId,
  getSelectedDay,
  setSelectedDay,
  renderSelectedDay
} from "./workout-session.js";
import { initNavigation } from "./navigation.js";

function init() {
  initNavigation({
    getWorkoutId,
    getSelectedDay,
    setSelectedDay,
    renderDay: renderSelectedDay
  });

  initWorkoutSession();
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
