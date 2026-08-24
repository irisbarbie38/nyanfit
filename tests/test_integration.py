import pytest

from app import db, User, WorkoutSession, WORKOUTS
from werkzeug.security import generate_password_hash


def login_as(client, user):
    with client.session_transaction() as sess:
        sess["user_id"] = user.id
        sess["username"] = user.username


def register(client, username="integration", password="password123"):
    return client.post(
        "/register",
        data={
            "username": username,
            "password": password,
        },
        follow_redirects=False,
    )


def login(client, username="integration", password="password123"):
    return client.post(
        "/login",
        data={
            "username": username,
            "password": password,
        },
        follow_redirects=False,
    )


def test_public_auth_flow(client):
    response = register(client)

    assert response.status_code == 302

    response = client.get("/")

    assert response.status_code == 200

    response = client.post("/logout", follow_redirects=False)

    assert response.status_code == 302

    response = client.get("/")

    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_login_flow(client):
    response = register(client, "login-user", "password123")

    assert response.status_code == 302

    client.post("/logout")

    response = login(client, "login-user", "password123")

    assert response.status_code == 302

    with client.session_transaction() as sess:
        assert "user_id" in sess
        assert sess["username"] == "login-user"


def test_invalid_login_is_rejected(client):
    register(client, "invalid-login", "password123")
    client.post("/logout")

    response = login(client, "invalid-login", "wrong-password")

    assert response.status_code == 200


def test_all_five_workout_days_are_exposed(client, user):
    login_as(client, user)

    response = client.get("/")

    assert response.status_code == 200

    html = response.get_data(as_text=True)

    for day in range(5):
        assert f'data-day="{day}"' in html

    assert len(WORKOUTS) == 5

    for workout in WORKOUTS:
        assert workout["name"].encode() in response.data


def test_unauthenticated_api_is_rejected(client):
    response = client.get("/api/session/current")

    assert response.status_code in (401, 302)


@pytest.mark.parametrize("day", range(5))
def test_start_each_workout_day(client, user, day):
    login_as(client, user)

    response = client.post(
        "/api/session/start",
        json={
            "workout_day": day,
            "day": day,
        },
    )

    assert response.status_code in (200, 201)

    data = response.get_json()

    assert data["ok"] is True
    assert data["session_id"] > 0
    assert data["workout_day"] == day

    with client.application.app_context():
        workout = db.session.get(
            WorkoutSession,
            data["session_id"],
        )

        assert workout is not None
        assert workout.user_id == user.id
        assert workout.workout_day == day
        assert workout.ended_at is None


def test_existing_open_session_is_resumed(client, user):
    login_as(client, user)

    first = client.post(
        "/api/session/start",
        json={"workout_day": 2},
    )

    assert first.status_code in (200, 201)

    first_data = first.get_json()

    second = client.post(
        "/api/session/start",
        json={"workout_day": 4},
    )

    assert second.status_code in (200, 201)

    second_data = second.get_json()

    assert second_data["session_id"] == first_data["session_id"]


def test_current_session(client, user):
    login_as(client, user)

    response = client.get("/api/session/current")

    assert response.status_code == 200

    data = response.get_json()

    assert data.get("session_id") is None or data.get("id") is None

    started = client.post(
        "/api/session/start",
        json={"workout_day": 3},
    )

    assert started.status_code in (200, 201)

    session_id = started.get_json()["session_id"]

    response = client.get("/api/session/current")

    assert response.status_code == 200

    data = response.get_json()

    assert (
        data.get("id") == session_id
        or data.get("session_id") == session_id
    )


def test_session_finish(client, user):
    login_as(client, user)

    started = client.post(
        "/api/session/start",
        json={"workout_day": 0},
    )

    assert started.status_code in (200, 201)

    session_id = started.get_json()["session_id"]

    response = client.post(
        "/api/session/finish",
        json={"session_id": session_id},
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["ok"] is True

    with client.application.app_context():
        workout = db.session.get(
            WorkoutSession,
            session_id,
        )

        assert workout is not None
        assert workout.ended_at is not None


def test_cannot_finish_another_users_session(client, user):
    login_as(client, user)

    with client.application.app_context():
        other = User(
            username="integration-other",
            password_hash=generate_password_hash("password123"),
        )

        db.session.add(other)
        db.session.commit()

        workout = WorkoutSession(
            user_id=other.id,
            workout_day=0,
            focus=WORKOUTS[0]["name"],
        )

        db.session.add(workout)
        db.session.commit()

        session_id = workout.id

    response = client.post(
        "/api/session/finish",
        json={"session_id": session_id},
    )

    assert response.status_code in (403, 404)


def test_session_abort(client, user):
    login_as(client, user)

    started = client.post(
        "/api/session/start",
        json={"workout_day": 1},
    )

    assert started.status_code in (200, 201)

    session_id = started.get_json()["session_id"]

    response = client.post(
        "/api/session/abort",
        json={"session_id": session_id},
    )

    assert response.status_code == 200

    current = client.get("/api/session/current")

    assert current.status_code == 200

    data = current.get_json()

    assert data.get("session_id") is None or data.get("id") is None


@pytest.mark.parametrize("day", [-1, 5, 99, "abc"])
def test_invalid_workout_day_is_rejected(client, user, day):
    login_as(client, user)

    response = client.post(
        "/api/session/start",
        json={"workout_day": day},
    )

    assert response.status_code == 400


def test_workout_definition_is_complete():
    assert len(WORKOUTS) == 5
    assert [w["day"] for w in WORKOUTS] == [0, 1, 2, 3, 4]

    for workout in WORKOUTS:
        assert workout["name"]
        assert workout["exercises"]

        for exercise in workout["exercises"]:
            assert exercise["id"]
            assert exercise["name"]
            assert exercise["sets"] > 0
            assert exercise["min_reps"] > 0
            assert exercise["max_reps"] >= exercise["min_reps"]


def test_database_session_belongs_to_logged_user(client, user):
    login_as(client, user)

    response = client.post(
        "/api/session/start",
        json={"workout_day": 4},
    )

    assert response.status_code in (200, 201)

    session_id = response.get_json()["session_id"]

    with client.application.app_context():
        workout = db.session.get(
            WorkoutSession,
            session_id,
        )

        assert workout is not None
        assert workout.user_id == user.id
        assert workout.workout_day == 4


def test_finished_session_cannot_be_finished_again(client, user):
    login_as(client, user)

    started = client.post(
        "/api/session/start",
        json={"workout_day": 0},
    )

    assert started.status_code in (200, 201)

    session_id = started.get_json()["session_id"]

    first = client.post(
        "/api/session/finish",
        json={"session_id": session_id},
    )

    assert first.status_code == 200

    second = client.post(
        "/api/session/finish",
        json={"session_id": session_id},
    )

    assert second.status_code in (400, 404)


def test_workout_finishes_automatically_after_all_required_sets(client, user):
    login_as(client, user)

    day = 0
    workout = WORKOUTS[day]

    started = client.post(
        "/api/session/start",
        json={"workout_day": day},
    )

    assert started.status_code in (200, 201)

    session_id = started.get_json()["session_id"]

    for exercise in workout["exercises"]:
        for set_number in range(1, exercise["sets"] + 1):
            response = client.post(
                f"/api/workouts/{session_id}/sets",
                json={
                    "exercise": exercise["id"],
                    "set_number": set_number,
                    "weight": 10,
                    "reps": exercise["min_reps"],
                    "rir": 2,
                },
            )

            assert response.status_code == 200

    with client.application.app_context():
        session = db.session.get(WorkoutSession, session_id)

        assert session is not None
        assert session.ended_at is not None


def test_workout_does_not_finish_before_all_required_sets(client, user):
    login_as(client, user)

    day = 0
    workout = WORKOUTS[day]

    started = client.post(
        "/api/session/start",
        json={"workout_day": day},
    )

    assert started.status_code in (200, 201)

    session_id = started.get_json()["session_id"]

    first_exercise = workout["exercises"][0]

    response = client.post(
        f"/api/workouts/{session_id}/sets",
        json={
            "exercise": first_exercise["id"],
            "set_number": 1,
            "weight": 10,
            "reps": first_exercise["min_reps"],
            "rir": 2,
        },
    )

    assert response.status_code == 200

    current = client.get(f"/api/workouts/{session_id}")

    assert current.status_code == 200
    assert current.get_json()["ended_at"] is None


def test_finished_workout_rejects_new_sets(client, user):
    login_as(client, user)

    day = 0
    workout = WORKOUTS[day]

    started = client.post(
        "/api/session/start",
        json={"workout_day": day},
    )

    session_id = started.get_json()["session_id"]

    for exercise in workout["exercises"]:
        for set_number in range(1, exercise["sets"] + 1):
            response = client.post(
                f"/api/workouts/{session_id}/sets",
                json={
                    "exercise": exercise["id"],
                    "set_number": set_number,
                    "weight": 10,
                    "reps": exercise["min_reps"],
                    "rir": 2,
                },
            )
            assert response.status_code == 200

    response = client.post(
        f"/api/workouts/{session_id}/sets",
        json={
            "exercise": workout["exercises"][0]["id"],
            "set_number": 99,
            "weight": 10,
            "reps": 10,
            "rir": 2,
        },
    )

    assert response.status_code == 404
