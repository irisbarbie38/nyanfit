export function initNavigation({
  getWorkoutId,
  getSelectedDay,
  setSelectedDay,
  renderDay
}) {
  document
    .querySelectorAll(".day-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        if (getWorkoutId?.()) {
          alert(
            "Finalize o treino atual antes de trocar o dia."
          );
          return;
        }

        const day =
          Number(button.dataset.day);

        setSelectedDay(day);
        renderDay(day);
      });
    });

  document
    .querySelector("#navWorkouts")
    ?.addEventListener("click", () => {
      document
        .querySelector(".week-picker")
        ?.scrollIntoView?.();
    });

  document
    .querySelector("#navHistory")
    ?.addEventListener("click", () => {
      location.hash = "history";
    });

  document
    .querySelector("#navProgress")
    ?.addEventListener("click", () => {
      alert(
        "Progressão disponível pela API /api/progression."
      );
    });

  document
    .querySelector("#navProfile")
    ?.addEventListener("click", () => {
      location.href = "/profile";
    });
}
