from alembic import op
import sqlalchemy as sa


revision = "0003_user_defaults"
down_revision = "0002_user_body_profile"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("bmi", sa.Float(), nullable=True),
    )

    op.create_table(
        "user_exercise_defaults",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("exercise_id", sa.String(120), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rir", sa.Integer(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "user_id",
            "exercise_id",
            name="uq_user_exercise_default",
        ),
    )

    # Calcula o BMI dos usuários antigos que já possuem perfil completo.
    bind = op.get_bind()

    bind.execute(
        sa.text(
            """
            UPDATE users
            SET bmi = weight / POWER(height / 100.0, 2)
            WHERE height IS NOT NULL
              AND weight IS NOT NULL
              AND height > 0
            """
        )
    )


def downgrade():
    op.drop_table("user_exercise_defaults")
    op.drop_column("users", "bmi")
