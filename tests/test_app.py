def register(client, username="tester", password="password123"):
    return client.post(
        "/register",
        data={"username": username, "password": password},
        follow_redirects=True,
    )


def login(client, username="tester", password="password123"):
    return client.post(
        "/login",
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


def test_program_has_five_days(client):
    register(client)
    program = client.get("/api/program")
    assert program.status_code == 200
    data = program.get_json()
    assert len(data) == 5
    assert [item["day"] for item in data] == [0, 1, 2, 3, 4]
    assert all(len(item["exercises"]) == 3 for item in data)


def test_register_login_and_home(client):
    response = register(client)
    assert response.status_code == 200
    assert b"NyanFit" in response.data

    client.post("/logout")
    response = login(client)
    assert response.status_code == 200
    assert b"NyanFit" in response.data


def test_api_requires_authentication(client):
    assert client.get("/api/program").status_code == 401
    assert client.get("/api/history").status_code == 401


def test_start_each_workout_day(client):
    register(client)
    for day in range(5):
        session_id = start(client, day)
        payload = client.get(f"/api/workouts/{session_id}").get_json()
        assert payload["workout_day"] == day
        client.post(f"/api/workouts/{session_id}/finish")


def test_log_set_belongs_to_session_and_user(client):
    register(client)
    session_id = start(client, 0)

    response = client.post(
        f"/api/workouts/{session_id}/sets",
        json={"exercise": "Elevação pélvica (Hip Thrust)", "set_number": 1,
              "weight": 100, "reps": 10, "rir": 1},
    )
    assert response.status_code == 200

    workout = client.get(f"/api/workouts/{session_id}").get_json()
    assert len(workout["sets"]) == 1
    assert workout["sets"][0]["weight"] == 100
    assert workout["sets"][0]["reps"] == 10

    history = client.get("/api/history").get_json()
    assert len(history) == 1
    assert history[0]["workout_day"] == 0


def test_cannot_access_another_users_workout(client):
    register(client, "alice")
    session_id = start(client, 0)
    client.post("/logout")

    register(client, "bob")
    assert client.get(f"/api/workouts/{session_id}").status_code == 404
    assert client.post(
        f"/api/workouts/{session_id}/sets",
        json={"exercise": "x", "set_number": 1, "weight": 1, "reps": 1},
    ).status_code == 404


def test_stats_and_progression(client):
    register(client)
    session_id = start(client, 0)
    client.post(
        f"/api/workouts/{session_id}/sets",
        json={"exercise": "Elevação pélvica (Hip Thrust)", "set_number": 1,
              "weight": 100, "reps": 10, "rir": 1},
    )
    client.post(f"/api/workouts/{session_id}/finish")

    stats = client.get("/api/stats").get_json()
    assert stats["sets"] == 1
    assert stats["volume"] == 1000
    assert stats["sessions"] == 1

    progression = client.get("/api/progression").get_json()
    assert "Elevação pélvica (Hip Thrust)" in progression
    assert progression["Elevação pélvica (Hip Thrust)"][0]["weight"] == 100


def test_invalid_workout_day_is_rejected(client):
    register(client)
    response = client.post("/api/session/start", json={"workout_day": 9})
    assert response.status_code == 400
