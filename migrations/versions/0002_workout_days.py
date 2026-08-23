from alembic import op
import sqlalchemy as sa

revision = "0002_workout_days"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "workout_sessions",
        sa.Column("workout_day", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "sets_log",
        sa.Column("workout_day", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )


def downgrade():
    op.drop_column("sets_log", "workout_day")
    op.drop_column("workout_sessions", "workout_day")
