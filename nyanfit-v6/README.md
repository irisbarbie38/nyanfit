# NyanFit v6

Mobile-first Flask workout tracker inspired by the supplied NyanFit visual reference.

## Stack
- Flask
- SQLAlchemy / Flask-Migrate
- PostgreSQL via psycopg 3
- Responsive HTML/CSS/JS
- PNG pixel-art assets with transparent HTML hotspots
- Rest timer with localStorage persistence

## Render Free
Build:
`pip install -r requirements.txt && flask db upgrade`

Start:
`gunicorn --workers 2 --threads 4 --timeout 60 --access-logfile - --error-logfile - app:app`

Set `DATABASE_URL` to the Neon PostgreSQL connection string and `SECRET_KEY` in Render Environment.

## Local
```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export FLASK_APP=app.py
flask db upgrade
flask run
```
