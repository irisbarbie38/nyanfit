import pytest

from app import create_app, db, User
from werkzeug.security import generate_password_hash


@pytest.fixture()
def app():
    test_app = create_app({
        "TESTING": True,
        "SECRET_KEY": "pytest-secret",
        "SESSION_COOKIE_SECURE": False,
        "DATABASE_URL": "sqlite+pysqlite:///:memory:",
    })

    with test_app.app_context():
        db.create_all()

    yield test_app

    with test_app.app_context():
        db.session.remove()
        db.drop_all()
        db.engine.dispose()


@pytest.fixture()
def client(app):
    with app.test_client() as client:
        yield client


@pytest.fixture()
def user(app):
    with app.app_context():
        user = User(
            username="integration-user",
            password_hash=generate_password_hash("password123"),
        )
        db.session.add(user)
        db.session.commit()

        # Materializa os atributos antes de o contexto ser encerrado.
        user_id = user.id
        username = user.username

    # Retorna um objeto simples, não uma instância SQLAlchemy detached.
    return type(
        "TestUser",
        (),
        {
            "id": user_id,
            "username": username,
            "password": "password123",
        },
    )()
