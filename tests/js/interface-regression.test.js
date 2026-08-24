import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("regressões críticas da interface", () => {
  it("mantém o botão INICIAR TREINO no HTML", () => {
    const html = read("templates/index.html");

    expect(html).toContain('id="startWorkout"');
    expect(html).toContain("INICIAR TREINO");
  });

  it("botão INICIAR TREINO continua sendo dinâmico", () => {
    const html = read("templates/index.html");

    const match = html.match(
      /<button[^>]*id="startWorkout"[^>]*>/
    );

    expect(match).not.toBeNull();
    expect(match[0]).toContain("dynamic");
  });

  it("index expõe os dados do usuário para o JS", () => {
    const html = read("templates/index.html");

    expect(html).toContain('id="userProfileData"');
    expect(html).toContain("user_profile");
  });

  it("app.js possui o handler de iniciar treino", () => {
    const js = read("static/js/app.js");

    expect(js).toContain("startWorkout");
    expect(js).toContain("/api/workouts");
  });

  it("app.js usa os defaults dos exercícios", () => {
    const js = read("static/js/app.js");

    expect(js).toContain("suggestSetDefaults");
    expect(js).toContain('$("#weight")');
    expect(js).toContain('$("#reps")');
  });

  it("Perfil não faz logout", () => {
    const js = read("static/js/app.js");

    expect(js).not.toContain('location.href = "/logout"');
    expect(js).toContain('location.href = "/profile"');
  });

  it("perfil possui os campos de altura e peso", () => {
    const html = read("templates/profile.html");

    expect(html).toContain('name="height"');
    expect(html).toContain('name="weight"');
    expect(html).toContain('type="number"');
  });
});
