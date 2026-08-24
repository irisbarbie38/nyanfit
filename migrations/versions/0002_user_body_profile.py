from alembic import op
import sqlalchemy as sa


revision = "0002_user_body_profile"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("height", sa.Float(), nullable=True),
    )

    op.add_column(
        "users",
        sa.Column("weight", sa.Float(), nullable=True),
    )


def downgrade():
    op.drop_column("users", "weight")
    op.drop_column("users", "height")
