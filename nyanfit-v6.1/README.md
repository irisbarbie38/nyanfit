# NyanFit v6.1 — Pixel Canvas

Reconstrução do dashboard a partir do mockup 832×1536. A tela usa uma composição visual fixa em coordenadas lógicas, escalada responsivamente. A arte é preservada como skin PNG e o conteúdo dinâmico é colocado em hotspots HTML sobre ela.

## Stack
- Flask
- SQLAlchemy / Flask-Migrate
- PostgreSQL via psycopg 3
- Gunicorn
- Neon + Render Free

## Desenvolvimento

```bash
export SECRET_KEY='dev-secret'
export DATABASE_URL='postgresql+psycopg://...'
flask db upgrade
flask run --debug
```

## Deploy
O `render.yaml` executa `flask db upgrade` no build e inicia Gunicorn. Configure `DATABASE_URL` para o banco Neon e deixe o Render gerar `SECRET_KEY`.

## Histórico
Esta versão deve ser marcada como `v6.1.0`, preservando `v5.0.0` e `v6.0.0`.
