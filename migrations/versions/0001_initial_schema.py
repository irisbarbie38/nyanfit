from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(80), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_index(
        "ix_users_username",
        "users",
        ["username"],
        unique=True,
    )

    op.create_table(
        "workout_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("workout_day", sa.Integer(), nullable=False),
        sa.Column("focus", sa.String(120), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
    )

    op.create_index(
        "ix_workout_sessions_user_id",
        "workout_sessions",
        ["user_id"],
    )

    op.create_index(
        "ix_workout_sessions_started_at",
        "workout_sessions",
        ["started_at"],
    )

    op.create_table(
        "sets_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "workout_id",
            sa.Integer(),
            sa.ForeignKey("workout_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("workout_day", sa.Integer(), nullable=False),
        sa.Column("exercise", sa.String(120), nullable=False),
        sa.Column("set_number", sa.Integer(), nullable=False),
        sa.Column(
            "weight",
            sa.Float(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "reps",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column("rir", sa.Integer(), nullable=True),
        sa.Column(
            "rest_seconds",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_index(
        "ix_sets_log_workout_id",
        "sets_log",
        ["workout_id"],
    )

    op.create_index(
        "ix_sets_log_created_at",
        "sets_log",
        ["created_at"],
    )

    op.create_unique_constraint(
        "uq_sets_log_workout_exercise_set",
        "sets_log",
        ["workout_id", "exercise", "set_number"],
    )


def downgrade():
    op.drop_table("sets_log")
    op.drop_table("workout_sessions")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
