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

        # Todo teste começa com um usuário válido.
        # Isso evita que testes de autenticação/perfil dependam
        # da execução de outro teste para criar o usuário.
        user = User(
            username="integration-user",
            password_hash=generate_password_hash("password123"),
        )
        db.session.add(user)
        db.session.commit()

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
        user = db.session.scalar(
            db.select(User).where(
                User.username == "integration-user"
            )
        )

        return type(
            "TestUser",
            (),
            {
                "id": user.id,
                "username": user.username,
                "password": "password123",
            },
        )()
