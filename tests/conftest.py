import os

import pytest

os.environ.setdefault("SECRET_KEY", "pytest-secret")
os.environ.setdefault("COOKIE_SECURE", "false")

from app import create_app, db


@pytest.fixture(scope="session")
def app():
    database_url = os.environ.get(
        "TEST_DATABASE_URL",
        "sqlite+pysqlite:///:memory:",
    )

    test_app = create_app({
        "TESTING": True,
        "SECRET_KEY": "pytest-secret",
        "SQLALCHEMY_DATABASE_URI": database_url,
        "SESSION_COOKIE_SECURE": False,
    })

    with test_app.app_context():
        db.drop_all()
        db.create_all()

    yield test_app

    with test_app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    with app.test_client() as client:
        yield client


@pytest.fixture()
def user(app):
    from werkzeug.security import generate_password_hash
    from app import User

    with app.app_context():
        user = User(
            username="integration-user",
            password_hash=generate_password_hash("password123"),
        )
        db.session.add(user)
        db.session.commit()

        return user
