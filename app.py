import os
import logging
from datetime import datetime
from functools import wraps

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()
migrate = Migrate()

WORKOUTS = [
    {"day": 0, "name": "Glúteo pesado", "icon": "🍑", "exercises": [
        {"name": "Elevação pélvica (Hip Thrust)", "sets": 4, "min_reps": 6, "max_reps": 10, "rir": "1–2", "rest": 180},
        {"name": "Agachamento no Smith", "sets": 3, "min_reps": 8, "max_reps": 12, "rir": "1–2", "rest": 150},
        {"name": "Abdução na máquina", "sets": 3, "min_reps": 15, "max_reps": 25, "rir": "1–2", "rest": 75},
    ]},
    {"day": 1, "name": "Posterior + glúteo", "icon": "⚡", "exercises": [
        {"name": "Stiff / Terra romeno", "sets": 4, "min_reps": 6, "max_reps": 10, "rir": "1–2", "rest": 180},
        {"name": "Mesa flexora", "sets": 3, "min_reps": 10, "max_reps": 15, "rir": "1–2", "rest": 90},
        {"name": "Coice no cabo", "sets": 3, "min_reps": 12, "max_reps": 20, "rir": "1–2", "rest": 75},
    ]},
    {"day": 2, "name": "Glúteo unilateral", "icon": "⭐", "exercises": [
        {"name": "Búlgaro no Smith", "sets": 3, "min_reps": 8, "max_reps": 12, "rir": "1–2", "rest": 150},
        {"name": "Leg press", "sets": 3, "min_reps": 10, "max_reps": 15, "rir": "1–2", "rest": 150},
        {"name": "Abdução na máquina", "sets": 3, "min_reps": 15, "max_reps": 25, "rir": "1–2", "rest": 75},
    ]},
    {"day": 3, "name": "Glúteo + core", "icon": "💗", "exercises": [
        {"name": "Elevação pélvica (Hip Thrust)", "sets": 3, "min_reps": 10, "max_reps": 12, "rir": "1–2", "rest": 150},
        {"name": "Extensão de quadril no cabo", "sets": 3, "min_reps": 12, "max_reps": 20, "rir": "1–2", "rest": 75},
        {"name": "Pallof press", "sets": 3, "min_reps": 10, "max_reps": 15, "rir": "1–2", "rest": 60},
    ]},
    {"day": 4, "name": "Glúteo + posterior", "icon": "🌈", "exercises": [
        {"name": "Passada reversa no Smith", "sets": 3, "min_reps": 8, "max_reps": 12, "rir": "1–2", "rest": 150},
        {"name": "Flexora sentada", "sets": 3, "min_reps": 10, "max_reps": 15, "rir": "1–2", "rest": 90},
        {"name": "Abdução na máquina", "sets": 3, "min_reps": 15, "max_reps": 25, "rir": "1–2", "rest": 75},
    ]},
]


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())
    sessions = db.relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
    sets = db.relationship("SetLog", back_populates="user", cascade="all, delete-orphan")


class WorkoutSession(db.Model):
    __tablename__ = "workout_sessions"
    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workout_day = db.Column(db.Integer, nullable=False)
    started_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())
    finished_at = db.Column(db.DateTime(timezone=True))
    duration_seconds = db.Column(db.Integer)
    user = db.relationship("User", back_populates="sessions")
    sets = db.relationship("SetLog", back_populates="session")


class SetLog(db.Model):
    __tablename__ = "sets_log"
    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workout_day = db.Column(db.Integer, nullable=False)
    exercise_name = db.Column(db.String(160), nullable=False)
    set_number = db.Column(db.Integer, nullable=False)
    weight = db.Column(db.Float, nullable=False, default=0)
    reps = db.Column(db.Integer, nullable=False, default=0)
    rir = db.Column(db.Integer)
    session_id = db.Column(db.BigInteger, db.ForeignKey("workout_sessions.id", ondelete="SET NULL"), index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    user = db.relationship("User", back_populates="sets")
    session = db.relationship("WorkoutSession", back_populates="sets")


def create_app():
    app = Flask(__name__)

    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
        elif database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    if not database_url:
        raise RuntimeError("DATABASE_URL não configurada.")

    secret_key = os.environ.get("SECRET_KEY")
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
        SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "true").lower() == "true",
        JSON_SORT_KEYS=False,
    )

    db.init_app(app)
    migrate.init_app(app, db)

    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
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

    def user_session(session_id, only_open=False):
        query = WorkoutSession.query.filter_by(id=session_id, user_id=session["user_id"])
        if only_open:
            query = query.filter(WorkoutSession.finished_at.is_(None))
        return query.first()

    @app.route("/")
    def index():
        if "user_id" not in session:
            return redirect(url_for("login"))
        return render_template("index.html", workouts=WORKOUTS)

    @app.route("/login", methods=["GET", "POST"])
    def login():
        error = None
        if request.method == "POST":
            username = request.form.get("username", "").strip().lower()
            password = request.form.get("password", "")
            user = User.query.filter_by(username=username).first()
            if user and check_password_hash(user.password_hash, password):
                session.clear()
                session["user_id"] = user.id
                session["username"] = user.username
                return redirect(url_for("index"))
            error = "Usuário ou senha inválidos."
        return render_template("login.html", error=error, register=False)

    @app.route("/register", methods=["GET", "POST"])
    def register():
        error = None
        if request.method == "POST":
            username = request.form.get("username", "").strip().lower()
            password = request.form.get("password", "")
            if len(username) < 3:
                error = "O usuário precisa ter pelo menos 3 caracteres."
            elif len(password) < 8:
                error = "A senha precisa ter pelo menos 8 caracteres."
            else:
                try:
                    user = User(username=username, password_hash=generate_password_hash(password))
                    db.session.add(user)
                    db.session.commit()
                    session["user_id"] = user.id
                    session["username"] = user.username
                    return redirect(url_for("index"))
                except Exception:
                    db.session.rollback()
                    app.logger.exception("Falha ao criar usuário")
                    error = "Não foi possível criar a conta."
        return render_template("login.html", error=error, register=True)

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"))

    @app.route("/api/session/start", methods=["POST"])
    @login_required
    def api_session_start():
        data = request.get_json(silent=True) or {}
        workout_day = int(data.get("workout_day", 0))
        existing = WorkoutSession.query.filter_by(
            user_id=session["user_id"], finished_at=None
        ).order_by(WorkoutSession.started_at.desc()).first()
        if existing:
            return jsonify(ok=True, session_id=existing.id, started_at=existing.started_at.isoformat(), resumed=True)

        ws = WorkoutSession(user_id=session["user_id"], workout_day=workout_day)
        db.session.add(ws)
        db.session.commit()
        return jsonify(ok=True, session_id=ws.id, started_at=ws.started_at.isoformat())

    @app.route("/api/session/finish", methods=["POST"])
    @login_required
    def api_session_finish():
        data = request.get_json(silent=True) or {}
        ws = user_session(int(data["session_id"]), only_open=True)
        if not ws:
            return jsonify(error="session_not_found"), 404

        ws.finished_at = datetime.now().astimezone()
        ws.duration_seconds = max(0, int((ws.finished_at - ws.started_at).total_seconds()))
        db.session.commit()

        sets = SetLog.query.filter_by(session_id=ws.id, user_id=session["user_id"]).all()
        volume = sum((x.weight or 0) * (x.reps or 0) for x in sets)
        return jsonify(
            ok=True,
            session={
                "id": ws.id,
                "workout_day": ws.workout_day,
                "started_at": ws.started_at.isoformat(),
                "finished_at": ws.finished_at.isoformat(),
                "duration_seconds": ws.duration_seconds,
            },
            summary={"sets": len(sets), "exercises": len({x.exercise_name for x in sets}), "volume": volume},
        )

    @app.route("/api/session/current")
    @login_required
    def api_session_current():
        ws = WorkoutSession.query.filter_by(
            user_id=session["user_id"], finished_at=None
        ).order_by(WorkoutSession.started_at.desc()).first()
        if not ws:
            return jsonify(session_id=None)
        return jsonify(id=ws.id, workout_day=ws.workout_day, started_at=ws.started_at.isoformat())

    @app.route("/api/session/abort", methods=["POST"])
    @login_required
    def api_session_abort():
        data = request.get_json(silent=True) or {}
        ws = user_session(int(data["session_id"]), only_open=True)
        if not ws:
            return jsonify(error="session_not_found"), 404
        SetLog.query.filter_by(session_id=ws.id, user_id=session["user_id"]).delete()
        db.session.delete(ws)
        db.session.commit()
        return jsonify(ok=True)

    @app.route("/api/log", methods=["POST"])
    @login_required
    def api_log():
        data = request.get_json(silent=True) or {}
        required = ("workout_day", "exercise_name", "set_number", "reps")
        if any(k not in data for k in required):
            return jsonify(error="missing_fields"), 400

        session_id = int(data["session_id"]) if data.get("session_id") else None
        if session_id and not user_session(session_id, only_open=True):
            return jsonify(error="invalid_session"), 400

        item = SetLog(
            user_id=session["user_id"],
            workout_day=int(data["workout_day"]),
            exercise_name=str(data["exercise_name"])[:160],
            set_number=int(data["set_number"]),
            weight=max(0, float(data.get("weight") or 0)),
            reps=max(0, int(data.get("reps") or 0)),
            rir=int(data["rir"]) if data.get("rir") not in (None, "", "null") else None,
            session_id=session_id,
        )
        db.session.add(item)
        db.session.commit()
        return jsonify(ok=True, id=item.id)

    @app.route("/api/stats")
    @login_required
    def api_stats():
        sets = SetLog.query.filter_by(user_id=session["user_id"]).count()
        volume = db.session.query(func.coalesce(func.sum(SetLog.weight * SetLog.reps), 0)).filter_by(
            user_id=session["user_id"]
        ).scalar()
        sessions = db.session.query(func.count(func.distinct(func.date(WorkoutSession.started_at)))).filter_by(
            user_id=session["user_id"]
        ).scalar()
        return jsonify(sets=sets, volume=float(volume or 0), sessions=int(sessions or 0))

    @app.route("/api/history")
    @login_required
    def api_history():
        rows = SetLog.query.filter_by(user_id=session["user_id"]).order_by(
            SetLog.created_at.desc(), SetLog.id.desc()
        ).limit(300).all()
        return jsonify([{
            "id": x.id, "workout_day": x.workout_day, "exercise_name": x.exercise_name,
            "set_number": x.set_number, "weight": x.weight, "reps": x.reps, "rir": x.rir,
            "created_at": x.created_at.isoformat(),
        } for x in rows])

    def progression_for(user_id, exercise_name):
        rows = SetLog.query.filter_by(user_id=user_id, exercise_name=exercise_name).order_by(
            SetLog.created_at.asc(), SetLog.id.asc()
        ).limit(500).all()
        sessions = {}
        for r in rows:
            key = r.created_at.date().isoformat()
            sessions.setdefault(key, []).append(r)
        points = []
        for day, values in sessions.items():
            valid = [x for x in values if x.reps]
            if not valid:
                continue
            best = max(valid, key=lambda x: (x.weight, x.reps))
            points.append({
                "date": day, "weight": float(best.weight or 0),
                "reps": int(best.reps),
                "volume": round(sum((x.weight or 0) * (x.reps or 0) for x in valid), 1),
            })
        return points

    @app.route("/api/progression")
    @login_required
    def api_progression():
        names = sorted({e["name"] for w in WORKOUTS for e in w["exercises"]})
        return jsonify({name: progression_for(session["user_id"], name) for name in names})

    @app.route("/api/sessions")
    @login_required
    def api_sessions():
        rows = WorkoutSession.query.filter_by(user_id=session["user_id"]).order_by(
            WorkoutSession.started_at.desc()
        ).limit(50).all()
        result = []
        for ws in rows:
            sets = SetLog.query.filter_by(session_id=ws.id).all()
            result.append({
                "id": ws.id, "workout_day": ws.workout_day,
                "started_at": ws.started_at.isoformat(),
                "finished_at": ws.finished_at.isoformat() if ws.finished_at else None,
                "duration_seconds": ws.duration_seconds,
                "sets": len(sets),
                "volume": float(sum((x.weight or 0) * (x.reps or 0) for x in sets)),
            })
        return jsonify(result)

    @app.route("/health")
    def health():
        try:
            db.session.execute(db.text("SELECT 1"))
            return jsonify(status="ok")
        except Exception:
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
