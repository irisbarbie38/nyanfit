
"""Initial NyanFit schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-22
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "workout_sessions",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("workout_day", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("duration_seconds", sa.Integer()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_workout_sessions_user_id", "workout_sessions", ["user_id"])

    op.create_table(
        "sets_log",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("workout_day", sa.Integer(), nullable=False),
        sa.Column("exercise_name", sa.String(length=160), nullable=False),
        sa.Column("set_number", sa.Integer(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rir", sa.Integer()),
        sa.Column("session_id", sa.BigInteger()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["workout_sessions.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_sets_log_user_id", "sets_log", ["user_id"])
    op.create_index("ix_sets_log_session_id", "sets_log", ["session_id"])
    op.create_index("ix_sets_log_created_at", "sets_log", ["created_at"])

def downgrade():
    op.drop_index("ix_sets_log_created_at", table_name="sets_log")
    op.drop_index("ix_sets_log_session_id", table_name="sets_log")
    op.drop_index("ix_sets_log_user_id", table_name="sets_log")
    op.drop_table("sets_log")
    op.drop_index("ix_workout_sessions_user_id", table_name="workout_sessions")
    op.drop_table("workout_sessions")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
