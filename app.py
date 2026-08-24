import logging
import os
from datetime import date, datetime, timedelta
from functools import wraps

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()
migrate = Migrate()

WORKOUTS = [
    {"day": 0, "name": "Glúteo pesado", "icon": "🍑", "exercises": [
        {"id": "hip-thrust", "name": "Elevação pélvica (Hip Thrust)", "sets": 4, "min_reps": 6, "max_reps": 10, "rir": "1–2", "rest": 180},
        {"id": "smith", "name": "Agachamento no Smith", "sets": 3, "min_reps": 8, "max_reps": 12, "rir": "1–2", "rest": 150},
        {"id": "abduction", "name": "Abdução na máquina", "sets": 3, "min_reps": 15, "max_reps": 25, "rir": "1–2", "rest": 75},
    ]},
    {"day": 1, "name": "Posterior + glúteo", "icon": "⚡", "exercises": [
        {"id": "stiff", "name": "Stiff / Terra romeno", "sets": 4, "min_reps": 6, "max_reps": 10, "rir": "1–2", "rest": 180},
        {"id": "leg-curl", "name": "Mesa flexora", "sets": 3, "min_reps": 10, "max_reps": 15, "rir": "1–2", "rest": 90},
        {"id": "cable-kickback", "name": "Coice no cabo", "sets": 3, "min_reps": 12, "max_reps": 20, "rir": "1–2", "rest": 75},
    ]},
    {"day": 2, "name": "Glúteo unilateral", "icon": "⭐", "exercises": [
        {"id": "bulgarian", "name": "Búlgaro no Smith", "sets": 3, "min_reps": 8, "max_reps": 12, "rir": "1–2", "rest": 150},
        {"id": "leg-press", "name": "Leg press", "sets": 3, "min_reps": 10, "max_reps": 15, "rir": "1–2", "rest": 150},
        {"id": "abduction", "name": "Abdução na máquina", "sets": 3, "min_reps": 15, "max_reps": 25, "rir": "1–2", "rest": 75},
    ]},
    {"day": 3, "name": "Glúteo + core", "icon": "💗", "exercises": [
        {"id": "hip-thrust", "name": "Elevação pélvica (Hip Thrust)", "sets": 3, "min_reps": 10, "max_reps": 12, "rir": "1–2", "rest": 150},
        {"id": "cable-hip", "name": "Extensão de quadril no cabo", "sets": 3, "min_reps": 12, "max_reps": 20, "rir": "1–2", "rest": 75},
        {"id": "pallof", "name": "Pallof press", "sets": 3, "min_reps": 10, "max_reps": 15, "rir": "1–2", "rest": 60},
    ]},
    {"day": 4, "name": "Glúteo + posterior", "icon": "🌈", "exercises": [
        {"id": "reverse-lunge", "name": "Passada reversa no Smith", "sets": 3, "min_reps": 8, "max_reps": 12, "rir": "1–2", "rest": 150},
        {"id": "seated-curl", "name": "Flexora sentada", "sets": 3, "min_reps": 10, "max_reps": 15, "rir": "1–2", "rest": 90},
        {"id": "abduction", "name": "Abdução na máquina", "sets": 3, "min_reps": 15, "max_reps": 25, "rir": "1–2", "rest": 75},
    ]},
]

WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX"]
EXERCISE_ICON = {
    "hip-thrust": "hip-thrust.png",
    "smith": "smith.png",
    "abduction": "abduction.png",
    "stiff": "placeholder.svg",
    "leg-curl": "placeholder.svg",
    "cable-kickback": "placeholder.svg",
    "bulgarian": "placeholder.svg",
    "leg-press": "placeholder.svg",
    "cable-hip": "placeholder.svg",
    "pallof": "placeholder.svg",
    "reverse-lunge": "placeholder.svg",
    "seated-curl": "placeholder.svg",
}


def workout_definition(day):
    return next((w for w in WORKOUTS if w["day"] == day), WORKOUTS[0])


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(), nullable=False, default=datetime.utcnow)
    sessions = db.relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")


class WorkoutSession(db.Model):
    __tablename__ = "workout_sessions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    workout_day = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    focus = db.Column(db.String(120), nullable=False)
    started_at = db.Column(db.DateTime(), nullable=False, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime())
    user = db.relationship("User", back_populates="sessions")
    sets = db.relationship("SetLog", back_populates="workout", cascade="all, delete-orphan")


class SetLog(db.Model):
    __tablename__ = "sets_log"
    id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey("workout_sessions.id"), nullable=False, index=True)
    workout_day = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    exercise = db.Column(db.String(120), nullable=False)
    set_number = db.Column(db.Integer, nullable=False)
    weight = db.Column(db.Float, nullable=False, default=0)
    reps = db.Column(db.Integer, nullable=False, default=0)
    rir = db.Column(db.Integer)
    created_at = db.Column(db.DateTime(), nullable=False, default=datetime.utcnow, index=True)
    workout = db.relationship("WorkoutSession", back_populates="sets")


def create_app(config=None):
    app = Flask(__name__)
    app.json.ensure_ascii = False

    config = config or {}

    testing = config.get("TESTING", False)

    # Produção:
    #   DATABASE_URL
    #
    # Testes:
    #   DATABASE_URL_TEST
    #
    # Assim os testes podem usar outro banco PostgreSQL
    # na mesma instância/servidor, mas em outro database/schema.
    if testing:
        database_url = (
            config.get("DATABASE_URL")
            or os.environ.get("DATABASE_URL_TEST")
        )
        if not database_url:
            raise RuntimeError(
                "DATABASE_URL_TEST não configurada para o ambiente de testes."
            )
    else:
        database_url = (
            config.get("DATABASE_URL")
            or os.environ.get("DATABASE_URL")
        )
        if not database_url:
            raise RuntimeError("DATABASE_URL não configurada.")

    if database_url.startswith("postgres://"):
        database_url = database_url.replace(
            "postgres://", "postgresql+psycopg://", 1
        )
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace(
            "postgresql://", "postgresql+psycopg://", 1
        )

    secret_key = (
        config.get("SECRET_KEY")
        or os.environ.get("SECRET_KEY")
    )
    if not secret_key:
        raise RuntimeError("SECRET_KEY não configurada.")

    app.config.update(
        SECRET_KEY=secret_key,
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ENGINE_OPTIONS={
            "pool_pre_ping": True,
            "pool_recycle": 300,
        },
        MAX_CONTENT_LENGTH=1024 * 1024,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get(
            "COOKIE_SECURE", "true"
        ).lower() == "true",
        TESTING=testing,
    )

    db.init_app(app)
    migrate.init_app(app, db)
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO")
    )

    @app.context_processor
    def inject_user():
        return {"current_user": session.get("username")}

    def login_required(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            if "user_id" not in session:
                if request.path.startswith("/api/"):
                    return jsonify(error="unauthorized"), 401
                return redirect(url_for("login"))
            return fn(*args, **kwargs)
        return wrapped

    def owned_session(session_id, only_open=False):
        query = db.select(WorkoutSession).where(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == session["user_id"],
        )
        if only_open:
            query = query.where(WorkoutSession.ended_at.is_(None))
        return db.session.scalar(query)

    @app.get("/")
    @login_required
    def index():
        today = date.today()
        default_day = min(today.weekday(), 4)
        uid = session["user_id"]
        week_start = datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())
        week_sessions = db.session.scalars(
            db.select(WorkoutSession).where(
                WorkoutSession.user_id == uid,
                WorkoutSession.started_at >= week_start,
            ).order_by(WorkoutSession.started_at.desc())
        ).all()
        sets_count = sum(len(w.sets) for w in week_sessions)
        volume = sum((s.weight or 0) * (s.reps or 0) for w in week_sessions for s in w.sets)
        completed = sum(1 for w in week_sessions if w.ended_at)
        recent_view = []
        for w in week_sessions[:2]:
            duration = None
            if w.ended_at:
                duration = max(0, int((w.ended_at - w.started_at).total_seconds() // 60))
            recent_view.append({
                "weekday": WEEKDAYS[w.started_at.weekday()] if w.started_at.weekday() < 5 else "FDS",
                "day": w.started_at.day,
                "focus": w.focus,
                "volume": sum((s.weight or 0) * (s.reps or 0) for s in w.sets),
                "duration": duration,
                "completed": bool(w.ended_at),
            })
        return render_template(
            "index.html",
            workouts=WORKOUTS,
            default_day=default_day,
            sets_count=sets_count,
            volume=volume,
            workouts_count=len(week_sessions),
            completed=completed,
            recent_view=recent_view,
            today=today,
            focus=workout_definition(default_day)["name"],
            weekdays=WEEKDAYS,
            exercise_icon=EXERCISE_ICON,
        )

    @app.route("/login", methods=["GET", "POST"])
    def login():
        error = None
        if request.method == "POST":
            username = request.form.get("username", "").strip().lower()
            password = request.form.get("password", "")
            user = db.session.scalar(db.select(User).where(User.username == username))
            if user and check_password_hash(user.password_hash, password):
                session.clear()
                session["user_id"] = user.id
                session["username"] = user.username
                return redirect(url_for("index"))
            error = "Usuário ou senha inválidos."
        return render_template("login.html", error=error, register=False)

    @app.post("/register")
    def register():
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")
        if len(username) < 3 or len(password) < 8:
            return render_template("login.html", error="Use pelo menos 3 caracteres no usuário e 8 na senha.", register=True), 400
        try:
            user = User(username=username, password_hash=generate_password_hash(password))
            db.session.add(user)
            db.session.commit()
            session.clear()
            session["user_id"] = user.id
            session["username"] = user.username
            return redirect(url_for("index"))
        except Exception:
            db.session.rollback()
            app.logger.exception("Falha ao criar usuário")
            return render_template("login.html", error="Esse usuário já existe ou não pôde ser criado.", register=True), 409

    @app.post("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"))

    @app.post("/api/session/start")
    @login_required
    def api_session_start():
        data = request.get_json(silent=True) or {}
        try:
            day = int(data.get("workout_day", data.get("day", 0)))
        except (TypeError, ValueError):
            return jsonify(error="invalid_workout_day"), 400
        if day not in range(5):
            return jsonify(error="invalid_workout_day"), 400
        existing = db.session.scalar(
            db.select(WorkoutSession).where(
                WorkoutSession.user_id == session["user_id"],
                WorkoutSession.ended_at.is_(None),
            ).order_by(WorkoutSession.started_at.desc())
        )
        if existing:
            return jsonify(ok=True, session_id=existing.id, workout_day=existing.workout_day,
                           started_at=existing.started_at.isoformat(), resumed=True)
        ws = WorkoutSession(
            user_id=session["user_id"],
            workout_day=day,
            focus=workout_definition(day)["name"],
            started_at=datetime.utcnow(),
        )
        db.session.add(ws)
        db.session.commit()
        return jsonify(ok=True, session_id=ws.id, workout_day=day, started_at=ws.started_at.isoformat()), 201

    @app.post("/api/session/finish")
    @login_required
    def api_session_finish():
        data = request.get_json(silent=True) or {}
        try:
            sid = int(data["session_id"])
        except (KeyError, TypeError, ValueError):
            return jsonify(error="missing_session_id"), 400
        ws = owned_session(sid, only_open=True)
        if not ws:
            return jsonify(error="session_not_found"), 404
        ws.ended_at = datetime.utcnow()
        sets = list(ws.sets)
        volume = sum((x.weight or 0) * (x.reps or 0) for x in sets)
        db.session.commit()
        return jsonify(ok=True, session={
            "id": ws.id, "workout_day": ws.workout_day,
            "started_at": ws.started_at.isoformat(), "ended_at": ws.ended_at.isoformat(),
        }, summary={"sets": len(sets), "exercises": len({x.exercise for x in sets}), "volume": volume})

    @app.get("/api/session/current")
    @login_required
    def api_session_current():
        ws = db.session.scalar(
            db.select(WorkoutSession).where(
                WorkoutSession.user_id == session["user_id"],
                WorkoutSession.ended_at.is_(None),
            ).order_by(WorkoutSession.started_at.desc())
        )
        if not ws:
            return jsonify(session_id=None)
        return jsonify(id=ws.id, workout_day=ws.workout_day, started_at=ws.started_at.isoformat())

    @app.post("/api/session/abort")
    @login_required
    def api_session_abort():
        data = request.get_json(silent=True) or {}
        try:
            sid = int(data["session_id"])
        except (KeyError, TypeError, ValueError):
            return jsonify(error="missing_session_id"), 400
        ws = owned_session(sid, only_open=True)
        if not ws:
            return jsonify(error="session_not_found"), 404
        db.session.delete(ws)
        db.session.commit()
        return jsonify(ok=True)

    @app.post("/api/log")
    @login_required
    def api_log():
        data = request.get_json(silent=True) or {}
        required = ("workout_day", "exercise_name", "set_number", "reps", "session_id")
        if any(k not in data for k in required):
            return jsonify(error="missing_fields"), 400
        try:
            day = int(data["workout_day"])
            sid = int(data["session_id"])
            set_number = int(data["set_number"])
            reps = int(data["reps"])
            weight = max(0.0, float(data.get("weight") or 0))
            rir = int(data["rir"]) if data.get("rir") not in (None, "", "null") else None
        except (TypeError, ValueError):
            return jsonify(error="invalid_fields"), 400
        if day not in range(5) or set_number < 1 or reps < 1 or (rir is not None and not 0 <= rir <= 5):
            return jsonify(error="invalid_fields"), 400
        ws = owned_session(sid, only_open=True)
        if not ws:
            return jsonify(error="invalid_session"), 400
        if ws.workout_day != day:
            return jsonify(error="workout_day_mismatch"), 400
        item = SetLog(
            workout_id=ws.id,
            workout_day=day,
            exercise=str(data["exercise_name"])[:120],
            set_number=set_number,
            weight=weight,
            reps=reps,
            rir=rir,
        )
        db.session.add(item)
        db.session.commit()
        return jsonify(ok=True, id=item.id)

    @app.post("/api/workouts")
    @login_required
    def create_workout_compat():
        return api_session_start()

    @app.get("/api/workouts/<int:workout_id>")
    @login_required
    def get_workout(workout_id):
        ws = owned_session(workout_id)
        if not ws:
            return jsonify(error="not_found"), 404
        return jsonify({
            "id": ws.id, "focus": ws.focus, "workout_day": ws.workout_day,
            "started_at": ws.started_at.isoformat(),
            "ended_at": ws.ended_at.isoformat() if ws.ended_at else None,
            "sets": [{"id": s.id, "exercise": s.exercise, "set_number": s.set_number,
                      "weight": s.weight, "reps": s.reps, "rir": s.rir} for s in ws.sets],
        })

    @app.post("/api/workouts/<int:workout_id>/sets")
    @login_required
    def add_set_compat(workout_id):
        ws = owned_session(workout_id, only_open=True)
        if not ws:
            return jsonify(error="session_not_found"), 404
        data = request.get_json(silent=True) or {}
        try:
            set_number = int(data.get("set_number", 1))
            reps = int(data.get("reps", 0))
            weight = max(0.0, float(data.get("weight") or 0))
            rir = int(data["rir"]) if data.get("rir") not in (None, "", "null") else None
        except (TypeError, ValueError):
            return jsonify(error="invalid_fields"), 400
        if not data.get("exercise") or set_number < 1 or reps < 1 or (rir is not None and not 0 <= rir <= 5):
            return jsonify(error="invalid_fields"), 400
        item = SetLog(
            workout_id=ws.id,
            workout_day=ws.workout_day,
            exercise=str(data["exercise"])[:120],
            set_number=set_number,
            weight=weight,
            reps=reps,
            rir=rir,
        )
        db.session.add(item)
        db.session.commit()
        return jsonify(ok=True, id=item.id)

    @app.post("/api/workouts/<int:workout_id>/finish")
    @login_required
    def finish_workout_compat(workout_id):
        ws = owned_session(workout_id, only_open=True)
        if not ws:
            return jsonify(error="session_not_found"), 404
        ws.ended_at = datetime.utcnow()
        db.session.commit()
        return jsonify(ok=True)

    @app.get("/api/history")
    @login_required
    def api_history():
        rows = db.session.scalars(
            db.select(SetLog).join(WorkoutSession).where(WorkoutSession.user_id == session["user_id"])
            .order_by(SetLog.created_at.desc(), SetLog.id.desc()).limit(300)
        ).all()
        return jsonify([{
            "id": x.id, "workout_day": x.workout_day, "exercise_name": x.exercise,
            "set_number": x.set_number, "weight": x.weight, "reps": x.reps, "rir": x.rir,
            "created_at": x.created_at.isoformat(),
        } for x in rows])

    @app.get("/api/stats")
    @login_required
    def api_stats():
        now = datetime.utcnow()
        week_start = datetime.combine(now.date() - timedelta(days=now.weekday()), datetime.min.time())
        sets = db.session.scalars(db.select(SetLog).join(WorkoutSession).where(
            WorkoutSession.user_id == session["user_id"], SetLog.created_at >= week_start
        )).all()
        volume = sum((x.weight or 0) * (x.reps or 0) for x in sets)
        started = db.session.scalars(db.select(WorkoutSession).where(
            WorkoutSession.user_id == session["user_id"], WorkoutSession.started_at >= week_start
        )).all()
        sessions = [x for x in started if x.ended_at]
        return jsonify(sets=len(sets), volume=float(volume), sessions=len(sessions),
                       completion=(len(sessions) / len(started) * 100) if started else 0)

    @app.get("/api/progression")
    @login_required
    def api_progression():
        names = sorted({e["name"] for w in WORKOUTS for e in w["exercises"]})
        result = {}
        for name in names:
            rows = db.session.scalars(
                db.select(SetLog).join(WorkoutSession).where(
                    WorkoutSession.user_id == session["user_id"], SetLog.exercise == name
                ).order_by(SetLog.created_at.asc(), SetLog.id.asc()).limit(500)
            ).all()
            by_day = {}
            for row in rows:
                by_day.setdefault(row.created_at.date().isoformat(), []).append(row)
            points = []
            for day, values in by_day.items():
                valid = [x for x in values if x.reps]
                if not valid:
                    continue
                best = max(valid, key=lambda x: (x.weight, x.reps))
                points.append({
                    "date": day,
                    "weight": float(best.weight or 0),
                    "reps": int(best.reps),
                    "volume": round(sum((x.weight or 0) * (x.reps or 0) for x in valid), 1),
                })
            result[name] = points
        return jsonify(result)

    @app.get("/api/sessions")
    @login_required
    def api_sessions():
        rows = db.session.scalars(db.select(WorkoutSession).where(
            WorkoutSession.user_id == session["user_id"]
        ).order_by(WorkoutSession.started_at.desc()).limit(50)).all()
        return jsonify([{
            "id": w.id, "workout_day": w.workout_day, "focus": w.focus,
            "started_at": w.started_at.isoformat(),
            "ended_at": w.ended_at.isoformat() if w.ended_at else None,
            "sets": len(w.sets),
            "volume": float(sum((x.weight or 0) * (x.reps or 0) for x in w.sets)),
        } for w in rows])

    @app.get("/api/program")
    @login_required
    def api_program():
        return jsonify(WORKOUTS)

    @app.get("/health")
    def health():
        try:
            db.session.execute(db.text("SELECT 1"))
            return jsonify(status="ok")
        except Exception:
            db.session.rollback()
            app.logger.exception("Health check failed")
            return jsonify(status="error"), 503

    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith("/api/"):
            return jsonify(error="not_found"), 404
        return render_template("error.html", code=404, message="Página não encontrada."), 404

    @app.errorhandler(400)
    def bad_request(error):
        if request.path.startswith("/api/"):
            return jsonify(error="bad_request"), 400
        return render_template("error.html", code=400, message="Requisição inválida."), 400

    @app.errorhandler(Exception)
    def internal_error(error):
        if isinstance(error, HTTPException):
            return error
        db.session.rollback()
        app.logger.exception("Unhandled application error")
        if request.path.startswith("/api/"):
            return jsonify(error="internal_server_error"), 500
        return render_template("error.html", code=500, message="Erro interno. Tente novamente."), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
