from app import db, User, WorkoutSession
from werkzeug.security import generate_password_hash


def login_user(client, app):
    with app.app_context():
        user = User.query.first()

        if user is None:
            user = User(
                username="regression",
                password_hash=generate_password_hash("password123"),
            )
            db.session.add(user)

        user.height = 168
        user.weight = 64
        db.session.commit()

        user_id = user.id
        username = user.username

    with client.session_transaction() as sess:
        sess["user_id"] = user_id
        sess["username"] = username

    return user_id


def test_start_workout_creates_session(client, app):
    user_id = login_user(client, app)

    response = client.post(
        "/api/session/start",
        json={"workout_day": 0},
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["ok"] is True
    assert data["session_id"] is not None
    assert data["workout_day"] == 0

    with app.app_context():
        workout = db.session.get(
            WorkoutSession,
            data["session_id"],
        )

        assert workout is not None
        assert workout.user_id == user_id
        assert workout.workout_day == 0
        assert workout.ended_at is None


def test_start_workout_can_resume_existing_session(client, app):
    login_user(client, app)

    first = client.post(
        "/api/session/start",
        json={"workout_day": 0},
    )

    first_data = first.get_json()

    second = client.post(
        "/api/session/start",
        json={"workout_day": 0},
    )

    second_data = second.get_json()

    assert first.status_code == 201
    assert second.status_code == 200

    assert second_data["ok"] is True
    assert second_data["resumed"] is True
    assert second_data["session_id"] == first_data["session_id"]


def test_start_workout_rejects_invalid_day(client, app):
    login_user(client, app)

    response = client.post(
        "/api/session/start",
        json={"workout_day": 99},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_workout_day"


def test_start_workout_rejects_missing_day(client, app):
    login_user(client, app)

    response = client.post(
        "/api/session/start",
        json={},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_workout_day"


def test_finish_workout_closes_session(client, app):
    login_user(client, app)

    start = client.post(
        "/api/session/start",
        json={"workout_day": 0},
    )

    assert start.status_code == 201

    session_id = start.get_json()["session_id"]

    response = client.post(
        "/api/session/finish",
        json={"session_id": session_id},
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["ok"] is True
    assert data["session"]["id"] == session_id
    assert data["session"]["ended_at"] is not None
