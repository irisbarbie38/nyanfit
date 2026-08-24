from app import db, User


def test_user_profile_fields_are_optional_until_completed(client, app):
    with app.app_context():
        user = User.query.first()

        assert user is not None
        assert user.height is None
        assert user.weight is None


def test_missing_profile_redirects_to_profile(client, app):
    with app.app_context():
        user = User.query.first()
        user.height = None
        user.weight = None
        db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user.id
            sess["username"] = user.username

    response = client.get("/")

    assert response.status_code == 302
    assert "/profile" in response.headers["Location"]


def test_profile_can_be_saved(client, app):
    with app.app_context():
        user = User.query.first()

        with client.session_transaction() as sess:
            sess["user_id"] = user.id
            sess["username"] = user.username

    response = client.post(
        "/profile",
        data={
            "height": "168",
            "weight": "64",
            "next": "/",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302

    with app.app_context():
        user = db.session.get(User, user.id)

        assert user.height == 168
        assert user.weight == 64


def test_profile_rejects_invalid_values(client, app):
    with app.app_context():
        user = User.query.first()

        with client.session_transaction() as sess:
            sess["user_id"] = user.id
            sess["username"] = user.username

    response = client.post(
        "/profile",
        data={
            "height": "20",
            "weight": "5",
        },
    )

    assert response.status_code == 400

    with app.app_context():
        user = db.session.get(User, user.id)

        assert user.height is None
        assert user.weight is None


def test_profile_api_returns_current_values(client, app):
    with app.app_context():
        user = User.query.first()
        user.height = 168
        user.weight = 64
        db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user.id
            sess["username"] = user.username

    response = client.get("/api/profile")

    assert response.status_code == 200

    data = response.get_json()

    assert data["height"] == 168
    assert data["weight"] == 64
    assert data["complete"] is True


def test_profile_api_updates_values(client, app):
    with app.app_context():
        user = User.query.first()

        with client.session_transaction() as sess:
            sess["user_id"] = user.id
            sess["username"] = user.username

    response = client.patch(
        "/api/profile",
        json={
            "height": 170,
            "weight": 67,
        },
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["ok"] is True
    assert data["height"] == 170
    assert data["weight"] == 67
    assert data["complete"] is True
