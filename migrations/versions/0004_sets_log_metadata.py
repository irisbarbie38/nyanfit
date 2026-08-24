from alembic import op
import sqlalchemy as sa

revision = "0004_sets_log_metadata"
down_revision = "0003_workout_days"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "sets_log",
        sa.Column(
            "rest_seconds",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    op.add_column(
        "sets_log",
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )


def downgrade():
    op.drop_column("sets_log", "created_at")
    op.drop_column("sets_log", "rest_seconds")
