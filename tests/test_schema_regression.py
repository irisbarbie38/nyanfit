from sqlalchemy import inspect

from app import db


def test_users_table_contains_profile_columns(app):
    with app.app_context():
        inspector = inspect(db.engine)

        columns = {
            column["name"]
            for column in inspector.get_columns("users")
        }

        assert "height" in columns
        assert "weight" in columns


def test_workout_sessions_still_have_five_day_support(app):
    with app.app_context():
        inspector = inspect(db.engine)

        columns = {
            column["name"]
            for column in inspector.get_columns("workout_sessions")
        }

        assert "workout_day" in columns


def test_sets_log_keeps_workout_metadata(app):
    with app.app_context():
        inspector = inspect(db.engine)

        columns = {
            column["name"]
            for column in inspector.get_columns("sets_log")
        }

        assert "workout_day" in columns
        assert "rest_seconds" in columns
        assert "created_at" in columns
