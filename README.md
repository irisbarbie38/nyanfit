
# NyanFit v4

Aplicação Flask mobile-first para acompanhamento de hipertrofia de glúteos.

## V4: produção mais limpa

- PostgreSQL persistente.
- SQLAlchemy como camada de acesso ao banco.
- Flask-Migrate/Alembic para migrations versionadas.
- `flask db upgrade` executado no pre-deploy.
- Sem criação de tabelas dentro de requisições.
- Pool com `pool_pre_ping`.
- Cookies de sessão configurados para produção.
- Tratamento de erros 400/404/500.
- Logs de aplicação e Gunicorn.
- Health check em `/health`.
- Sessões de treino reais.
- Histórico e progressão.
- PWA.
- Configuração pronta para Render.

## Deploy no Render

Web Service:

```text
Build:
pip install -r requirements.txt

Pre-Deploy:
flask db upgrade

Start:
gunicorn --workers 2 --threads 4 --timeout 60 --access-logfile - --error-logfile - app:app
```

Variáveis:

```text
DATABASE_URL=<Internal Database URL do PostgreSQL>
SECRET_KEY=<segredo aleatório>
COOKIE_SECURE=true
LOG_LEVEL=INFO
```

O `render.yaml` já contém isso.

## Desenvolvimento local

Crie um PostgreSQL local e configure:

```bash
export DATABASE_URL='postgresql://nyanfit:password@localhost:5432/nyanfit'
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export COOKIE_SECURE=false
```

Instale:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Inicialize o banco:

```bash
flask db upgrade
```

Execute:

```bash
flask --app app run --debug
```

## Criar uma nova migration

Depois de alterar os modelos SQLAlchemy:

```bash
flask db migrate -m "descricao da alteracao"
flask db upgrade
```

Revise a migration gerada antes de fazer commit.

## Fluxo de atualização

```bash
git add .
git commit -m "descricao"
git push
```

No Render:

```text
novo commit
   ↓
build
   ↓
flask db upgrade
   ↓
gunicorn
```

Se a migration falhar, o novo deploy não deve prosseguir para a inicialização normal do serviço.

## Segurança

- Não commite `.env`.
- Não coloque `DATABASE_URL` no código.
- Não coloque `SECRET_KEY` no GitHub.
- Use o `Internal Database URL` quando o Web Service e o PostgreSQL estiverem no Render.
