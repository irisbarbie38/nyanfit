# NyanFit v5

NyanFit is a mobile-first Flask workout tracker focused on glute growth, with a pixel-art / Nyan Cat interface.

## Stack

- Flask + Gunicorn
- PostgreSQL (Neon recommended)
- SQLAlchemy + Flask-Migrate/Alembic
- Responsive single-page dashboard
- Rest timer with vibration support
- Weekly summary, workout history and progression chart

## Deploy: Render Free + Neon

1. Create a PostgreSQL project in Neon.
2. Copy its `postgresql://...?...sslmode=require` connection string.
3. Create a Render Web Service from this repository.
4. Build command:

```bash
pip install -r requirements.txt && flask db upgrade
```

5. Start command:

```bash
gunicorn --workers 2 --threads 4 --timeout 60 --access-logfile - --error-logfile - app:app
```

6. Health check: `/health`
7. Set environment variables:
   - `DATABASE_URL` = Neon connection string
   - `SECRET_KEY` = long random secret
   - `COOKIE_SECURE=true`
   - `LOG_LEVEL=INFO`

Do not commit `.env` or production secrets.

## Local

```bash
export DATABASE_URL='postgresql+psycopg://...'
export SECRET_KEY='development-secret'
flask db upgrade
flask run --host 0.0.0.0 --port 5000
```
