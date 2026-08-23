from alembic import op
import sqlalchemy as sa

revision = "0002_rebuild_v61_schema"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    # v6.1 intentionally resets the old v5 schema.
    op.execute("DROP TABLE IF EXISTS sets_log CASCADE")
    op.execute("DROP TABLE IF EXISTS workout_sessions CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=80), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "workout_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("focus", sa.String(length=120), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime()),
    )

    op.create_table(
        "sets_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workout_id", sa.Integer(), sa.ForeignKey("workout_sessions.id"), nullable=False),
        sa.Column("exercise", sa.String(length=120), nullable=False),
        sa.Column("set_number", sa.Integer(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=False),
        sa.Column("rir", sa.Integer()),
    )


def downgrade():
    op.drop_table("sets_log")
    op.drop_table("workout_sessions")
    op.drop_table("users")
