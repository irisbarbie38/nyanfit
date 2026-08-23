import os
from datetime import datetime, date, timedelta
from functools import wraps

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()
migrate = Migrate()

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    sessions = db.relationship("WorkoutSession", backref="user", cascade="all, delete-orphan")

class WorkoutSession(db.Model):
    __tablename__ = "workout_sessions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    focus = db.Column(db.String(120), nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    ended_at = db.Column(db.DateTime)
    sets = db.relationship("SetLog", backref="workout", cascade="all, delete-orphan")

class SetLog(db.Model):
    __tablename__ = "sets_log"
    id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey("workout_sessions.id"), nullable=False)
    exercise = db.Column(db.String(120), nullable=False)
    set_number = db.Column(db.Integer, nullable=False)
    weight = db.Column(db.Float, default=0, nullable=False)
    reps = db.Column(db.Integer, nullable=False)
    rir = db.Column(db.Integer)

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY")
    if not app.config["SECRET_KEY"]:
        raise RuntimeError("SECRET_KEY is required")

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SESSION_COOKIE_SECURE"] = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

    db.init_app(app)
    migrate.init_app(app, db)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    def login_required(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if "user_id" not in session:
                return redirect(url_for("login"))
            return fn(*args, **kwargs)
        return wrapper

    @app.get("/login")
    def login():
        if "user_id" in session:
            return redirect(url_for("index"))
        return render_template("login.html")

    @app.post("/login")
    def do_login():
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")
        user = db.session.scalar(db.select(User).where(User.username == username))
        if not user or not check_password_hash(user.password_hash, password):
            return render_template("login.html", error="Usuário ou senha inválidos."), 401
        session.clear()
        session["user_id"] = user.id
        return redirect(url_for("index"))

    @app.post("/register")
    def register():
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")
        if len(username) < 3 or len(password) < 6:
            return render_template("login.html", error="Use pelo menos 3 caracteres no usuário e 6 na senha."), 400
        if db.session.scalar(db.select(User).where(User.username == username)):
            return render_template("login.html", error="Esse usuário já existe."), 409
        user = User(username=username, password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()
        session["user_id"] = user.id
        return redirect(url_for("index"))

    @app.post("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"))

    @app.get("/")
    @login_required
    def index():
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        uid = session["user_id"]
        week_sessions = db.session.scalars(
            db.select(WorkoutSession).where(
                WorkoutSession.user_id == uid,
                WorkoutSession.started_at >= datetime.combine(monday, datetime.min.time())
            ).order_by(WorkoutSession.started_at.desc())
        ).all()
        sets_count = sum(len(w.sets) for w in week_sessions)
        volume = sum(s.weight * s.reps for w in week_sessions for s in w.sets)
        completed = sum(1 for w in week_sessions if w.ended_at)
        recent = db.session.scalars(
            db.select(WorkoutSession).where(WorkoutSession.user_id == uid)
            .order_by(WorkoutSession.started_at.desc()).limit(5)
        ).all()
        exercises = [
            ("hip-thrust", "Elevação pélvica (Hip Thrust)", "4 séries", "6–10 reps", "RIR 1–2", 4),
            ("smith", "Agachamento no Smith", "3 séries", "8–12 reps", "RIR 1–2", 3),
            ("abduction", "Abdução na máquina", "3 séries", "15–25 reps", "RIR 1–2", 3),
        ]
        recent_view = []
        weekday = {0:"SEG",1:"TER",2:"QUA",3:"QUI",4:"SEX",5:"SÁB",6:"DOM"}
        for w in recent[:2]:
            duration = None
            if w.ended_at:
                duration = max(0, int((w.ended_at - w.started_at).total_seconds() // 60))
            recent_view.append({
                "weekday": weekday.get(w.started_at.weekday(), ""),
                "day": w.started_at.day,
                "focus": w.focus,
                "volume": sum(s.weight * s.reps for s in w.sets),
                "duration": duration,
                "completed": bool(w.ended_at),
            })
        return render_template(
            "index.html",
            exercises=exercises,
            sets_count=sets_count,
            volume=volume,
            workouts=len(week_sessions),
            completed=completed,
            recent=recent,
            recent_view=recent_view,
            today=today,
            focus="Glúteo pesado",
        )

    @app.post("/api/workouts")
    @login_required
    def create_workout():
        try:
            data = request.get_json(silent=True) or {}
            focus = str(data.get("focus") or "Glúteo pesado").strip()[:120]

            workout = WorkoutSession(
                user_id=session["user_id"],
                focus=focus,
                started_at=datetime.utcnow(),
            )

            db.session.add(workout)
            db.session.commit()

            return jsonify({"id": workout.id}), 201

        except Exception as exc:
            db.session.rollback()
            app.logger.exception("Erro ao criar workout")

            return jsonify({
                "error": "Não foi possível iniciar o treino.",
                "detail": str(exc),
            }), 500

    @app.post("/api/workouts/<int:workout_id>/sets")
    @login_required
    def add_set(workout_id):
        workout = db.get_or_404(WorkoutSession, workout_id)
        if workout.user_id != session["user_id"]:
            return jsonify({"error": "forbidden"}), 403
        data = request.get_json(silent=True) or {}
        entry = SetLog(
            workout_id=workout.id,
            exercise=data.get("exercise", ""),
            set_number=int(data.get("set_number", 1)),
            weight=float(data.get("weight", 0)),
            reps=int(data.get("reps", 0)),
            rir=int(data["rir"]) if data.get("rir") not in (None, "") else None,
        )
        db.session.add(entry)
        db.session.commit()
        return jsonify({"id": entry.id})

    @app.post("/api/workouts/<int:workout_id>/finish")
    @login_required
    def finish_workout(workout_id):
        workout = db.get_or_404(WorkoutSession, workout_id)
        if workout.user_id != session["user_id"]:
            return jsonify({"error": "forbidden"}), 403
        workout.ended_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"ok": True})

    @app.get("/api/history")
    @login_required
    def history():
        rows = db.session.scalars(
            db.select(WorkoutSession).where(WorkoutSession.user_id == session["user_id"])
            .order_by(WorkoutSession.started_at.desc()).limit(50)
        ).all()
        return jsonify([{
            "id": w.id,
            "focus": w.focus,
            "started_at": w.started_at.isoformat(),
            "ended_at": w.ended_at.isoformat() if w.ended_at else None,
            "sets": len(w.sets),
            "volume": sum(s.weight * s.reps for s in w.sets),
        } for w in rows])

    @app.errorhandler(404)
    def not_found(_):
        return render_template("error.html", code=404, message="Página não encontrada."), 404

    @app.errorhandler(500)
    def server_error(_):
        db.session.rollback()
        return render_template("error.html", code=500, message="Algo deu errado."), 500

    return app

app = create_app()
