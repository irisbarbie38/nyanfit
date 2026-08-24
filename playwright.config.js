import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,

  reporter: "list",

  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  webServer: {
    command:
      "mkdir -p .e2e && " +
      "DATABASE_URL_TEST=\"sqlite+pysqlite:///$PWD/.e2e/nyanfit.sqlite\" " +
      "SECRET_KEY=\"playwright-test-secret\" " +
      "COOKIE_SECURE=false " +
      "python -c \"from app import create_app, db; app=create_app({'TESTING': True}); app.app_context().push(); db.drop_all(); db.create_all()\" && " +
      "DATABASE_URL_TEST=\"sqlite+pysqlite:///$PWD/.e2e/nyanfit.sqlite\" " +
      "SECRET_KEY=\"playwright-test-secret\" " +
      "COOKIE_SECURE=false " +
      "TESTING=true " +
      "FLASK_APP=app.py " +
      "flask run --host 127.0.0.1 --port 5173",

    url: "http://127.0.0.1:5173/health",

    reuseExistingServer: false,
    timeout: 120000,
  },
});
