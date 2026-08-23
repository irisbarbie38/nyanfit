let workoutId = null;
let exerciseIndex = 0;
let setIndex = 0;

let restTimerId = null;
let restRemaining = 90;

const $ = (selector) => document.querySelector(selector);

const modal = $("#workoutModal");
const timer = $("#timer");
const modalExercise = $("#modalExercise");
const modalProgress = $("#modalProgress");
const startRestButton = $("#startRest");
const skipRestButton = $("#skipRest");

function getExercises() {
    return [...document.querySelectorAll(".exercise")];
}

function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
        seconds % 60
    ).padStart(2, "0")}`;
}

function renderTimer() {
    if (timer) {
        timer.textContent = formatTime(restRemaining);
    }
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

    if (skipRestButton) {
        skipRestButton.disabled = false;
    }
}

function openModal() {
    if (modal) {
        modal.classList.remove("hidden");
    }
}

function closeModal() {
    stopRest();

    if (modal) {
        modal.classList.add("hidden");
    }
}

function clearWorkoutState() {
    localStorage.removeItem("nyanfit-workout");

    workoutId = null;
    exerciseIndex = 0;
    setIndex = 0;
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options,
    });

    if (response.redirected && response.url.includes("/login")) {
        window.location.href = "/login";
        throw new Error("Sessão expirada.");
    }

    if (!response.ok) {
        let message = `HTTP ${response.status}`;

        try {
            const body = await response.json();

            if (body.error) {
                message = body.detail
                    ? `${body.error}: ${body.detail}`
                    : body.error;
            }
        } catch (_) {}

        throw new Error(message);
    }

    return response;
}

function updateProgress() {
    const list = getExercises();
    const current = list[exerciseIndex];

    if (!current) {
        return;
    }

    const total = Number(current.dataset.sets || 1);

    if (modalProgress) {
        modalProgress.textContent =
            `SÉRIE ${setIndex + 1}/${total}`;
    }
}

function updateExerciseView() {
    const list = getExercises();
    const current = list[exerciseIndex];

    if (!current) {
        return;
    }

    const title = current.querySelector(".exercise-title");

    if (modalExercise && title) {
        modalExercise.textContent = title.textContent.trim();
    }

    updateProgress();
    resetRest();

    const weight = $("#weight");
    const reps = $("#reps");
    const rir = $("#rir");

    if (weight) weight.value = "";
    if (reps) reps.value = "";
    if (rir) rir.value = "";
}

function calculateNextPosition(workout) {
    const list = getExercises();

    for (let i = 0; i < list.length; i++) {
        const exercise = list[i].dataset.exercise;
        const total = Number(list[i].dataset.sets || 1);

        const saved = (workout.sets || []).filter(
            (s) => s.exercise === exercise
        ).length;

        if (saved < total) {
            exerciseIndex = i;
            setIndex = saved;
            return;
        }
    }

    exerciseIndex = list.length;
    setIndex = 0;
}

async function ensureWorkout() {
    if (workoutId) {
        try {
            const response = await api(
                `/api/workouts/${workoutId}`
            );

            const workout = await response.json();

            if (!workout.ended_at) {
                calculateNextPosition(workout);
                return workoutId;
            }
        } catch (_) {
            // ID antigo/inválido.
        }

        clearWorkoutState();
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
        throw new Error(
            "A API não retornou o ID do treino."
        );
    }

    workoutId = Number(data.id);

    localStorage.setItem(
        "nyanfit-workout",
        String(workoutId)
    );

    exerciseIndex = 0;
    setIndex = 0;

    return workoutId;
}

async function startWorkout() {
    await ensureWorkout();

    const list = getExercises();

    if (exerciseIndex >= list.length) {
        alert("Este treino já possui todas as séries registradas.");
        return;
    }

    openModal();
    updateExerciseView();
}

async function selectExercise(button) {
    const list = getExercises();
    const index = list.indexOf(button);

    if (index < 0) {
        return;
    }

    try {
        await ensureWorkout();

        exerciseIndex = index;

        const exercise = button.dataset.exercise;

        const response = await api(
            `/api/workouts/${workoutId}`
        );

        const workout = await response.json();

        const saved = (workout.sets || []).filter(
            (s) => s.exercise === exercise
        ).length;

        setIndex = Math.min(
            saved,
            Number(button.dataset.sets || 1) - 1
        );

        openModal();
        updateExerciseView();

    } catch (error) {
        console.error(error);

        alert(
            error.message ||
            "Não foi possível abrir o exercício."
        );
    }
}

async function saveSet() {
    try {
        await ensureWorkout();

        const list = getExercises();
        const current = list[exerciseIndex];

        if (!current) {
            throw new Error("Exercício inválido.");
        }

        const exercise = current.dataset.exercise;
        const total = Number(current.dataset.sets || 1);

        if (setIndex >= total) {
            throw new Error(
                "Todas as séries deste exercício já foram salvas."
            );
        }

        const weightInput = $("#weight");
        const repsInput = $("#reps");
        const rirInput = $("#rir");

        const weight = Number(
            weightInput?.value || 0
        );

        const reps = Number(
            repsInput?.value || 0
        );

        const rirRaw = rirInput?.value ?? "";

        const rir =
            rirRaw === ""
                ? null
                : Number(rirRaw);

        if (!Number.isFinite(weight) || weight < 0) {
            throw new Error("Peso inválido.");
        }

        if (!Number.isInteger(reps) || reps <= 0) {
            throw new Error(
                "Informe as repetições."
            );
        }

        if (
            rir !== null &&
            (
                !Number.isInteger(rir) ||
                rir < 0 ||
                rir > 5
            )
        ) {
            throw new Error("RIR inválido.");
        }

        await api(
            `/api/workouts/${workoutId}/sets`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify({
                    exercise,
                    set_number: setIndex + 1,
                    weight,
                    reps,
                    rir,
                }),
            }
        );

        const count =
            current.querySelector(".count");

        if (count) {
            count.textContent =
                `${Math.min(setIndex + 1, total)}/${total}`;
        }

        if (weightInput) {
            weightInput.value = "";
        }

        if (repsInput) {
            repsInput.value = "";
        }

        if (rirInput) {
            rirInput.value = "";
        }

        if (startRestButton) {
            startRestButton.classList.remove(
                "hidden"
            );
        }

        if (skipRestButton) {
            skipRestButton.classList.remove(
                "hidden"
            );
        }

        if (modalProgress) {
            modalProgress.textContent =
                "SÉRIE SALVA · DESCANSO";
        }

    } catch (error) {
        console.error("saveSet:", error);

        alert(
            error.message ||
            "Não foi possível salvar a série."
        );
    }
}

function advanceAfterRest() {
    resetRest();

    const list = getExercises();
    const current = list[exerciseIndex];

    if (!current) {
        return;
    }

    const total = Number(
        current.dataset.sets || 1
    );

    setIndex += 1;

    if (setIndex >= total) {
        exerciseIndex += 1;
        setIndex = 0;
    }

    if (exerciseIndex >= list.length) {
        if (modalProgress) {
            modalProgress.textContent =
                "TREINO CONCLUÍDO";
        }

        alert(
            "Todas as séries foram concluídas. Finalize o treino."
        );

        return;
    }

    updateExerciseView();
}

function startRest() {
    if (restTimerId) {
        return;
    }

    restRemaining = 90;
    renderTimer();

    if (startRestButton) {
        startRestButton.disabled = true;
        startRestButton.textContent =
            "DESCANSANDO...";
    }

    restTimerId = setInterval(() => {
        restRemaining -= 1;

        renderTimer();

        if (restRemaining <= 0) {
            stopRest();

            if (navigator.vibrate) {
                navigator.vibrate([
                    180,
                    100,
                    180,
                ]);
            }

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
        console.error(
            "finishWorkout:",
            error
        );

        alert(
            error.message ||
            "Não foi possível finalizar o treino."
        );
    }
}

async function restoreWorkout() {
    const saved =
        localStorage.getItem(
            "nyanfit-workout"
        );

    if (!saved) {
        return;
    }

    const id = Number(saved);

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        clearWorkoutState();
        return;
    }

    workoutId = id;

    try {
        const response = await api(
            `/api/workouts/${id}`
        );

        const workout =
            await response.json();

        if (workout.ended_at) {
            clearWorkoutState();
            return;
        }

        calculateNextPosition(workout);

    } catch (_) {
        clearWorkoutState();
    }
}

function init() {
    restoreWorkout();

    $("#startWorkout")?.addEventListener(
        "click",
        (event) => {
            event.preventDefault();

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
        (event) => {
            event.preventDefault();
            closeModal();
        }
    );

    $("#saveSet")?.addEventListener(
        "click",
        (event) => {
            event.preventDefault();
            saveSet();
        }
    );

    startRestButton?.addEventListener(
        "click",
        (event) => {
            event.preventDefault();
            startRest();
        }
    );

    skipRestButton?.addEventListener(
        "click",
        (event) => {
            event.preventDefault();
            skipRest();
        }
    );

    $("#finishWorkout")?.addEventListener(
        "click",
        (event) => {
            event.preventDefault();
            finishWorkout();
        }
    );

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

    resetRest();
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        init,
        { once: true }
    );
} else {
    init();
}
