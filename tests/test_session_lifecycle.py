def register(client, username="tester", password="password123"):
    return client.post(
        "/register",
        data={"username": username, "password": password},
        follow_redirects=True,
    )


def start(client, day):
    response = client.post(
        "/api/session/start",
        json={"workout_day": day},
    )
    assert response.status_code == 201
    return response.get_json()["session_id"]


def add_set(client, session_id, exercise="hip-thrust", set_number=1):
    return client.post(
        f"/api/workouts/{session_id}/sets",
        json={
            "exercise": exercise,
            "set_number": set_number,
            "weight": 100,
            "reps": 10,
            "rir": 1,
        },
    )


def complete_day_zero(client, session_id):
    for exercise_id, total in (
        ("hip-thrust", 4),
        ("smith", 3),
        ("abduction", 3),
    ):
        for set_number in range(1, total + 1):
            response = add_set(
                client,
                session_id,
                exercise_id,
                set_number,
            )
            assert response.status_code == 200


def test_current_session_returns_open_session(client):
    register(client)
    session_id = start(client, 3)

    response = client.get("/api/session/current")
    data = response.get_json()

    assert response.status_code == 200
    assert data["id"] == session_id
    assert data["workout_day"] == 3
    assert data["started_at"]


def test_current_session_is_empty_after_finish(client):
    register(client)
    session_id = start(client, 0)

    response = client.post(
        f"/api/workouts/{session_id}/finish"
    )
    assert response.status_code == 200

    current = client.get("/api/session/current")

    assert current.status_code == 200
    assert current.get_json()["session_id"] is None


def test_open_session_is_reused_when_starting_same_day(client):
    register(client)

    first_response = client.post(
        "/api/session/start",
        json={"workout_day": 2},
    )
    assert first_response.status_code == 201

    first = first_response.get_json()["session_id"]

    second_response = client.post(
        "/api/session/start",
        json={"workout_day": 2},
    )
    assert second_response.status_code == 200

    second = second_response.get_json()["session_id"]

    assert second == first


def test_starting_different_day_resumes_existing_session(client):
    register(client)

    first = start(client, 1)

    response = client.post(
        "/api/session/start",
        json={"workout_day": 4},
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["ok"] is True
    assert data["resumed"] is True
    assert data["session_id"] == first
    assert data["workout_day"] == 1

    current = client.get("/api/session/current")

    assert current.status_code == 200

    current_data = current.get_json()

    assert current_data["id"] == first
    assert current_data["workout_day"] == 1


def test_aborting_open_session_removes_it(client):
    register(client)
    session_id = start(client, 0)

    response = client.post(
        "/api/session/abort",
        json={"session_id": session_id},
    )

    assert response.status_code == 200
    assert response.get_json()["ok"] is True

    assert client.get(
        f"/api/workouts/{session_id}"
    ).status_code == 404

    assert client.get(
        "/api/session/current"
    ).get_json()["session_id"] is None


def test_finished_session_cannot_be_finished_again(client):
    register(client)
    session_id = start(client, 0)

    first = client.post(
        f"/api/workouts/{session_id}/finish"
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/workouts/{session_id}/finish"
    )

    assert second.status_code == 404


def test_finished_workout_rejects_new_sets(client):
    register(client)
    session_id = start(client, 0)

    complete_day_zero(client, session_id)

    response = add_set(
        client,
        session_id,
        "hip-thrust",
        99,
    )

    assert response.status_code == 404
