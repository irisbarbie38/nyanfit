import { api } from "../../static/js/api.js";

describe("api helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("envia credenciais same-origin", async () => {
    const response = { ok: true, redirected: false };
    global.fetch = vi.fn().mockResolvedValue(response);

    await api("/api/program");

    expect(fetch).toHaveBeenCalledWith(
      "/api/program",
      expect.objectContaining({ credentials: "same-origin" })
    );
  });

  test("converte erro JSON em Error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      redirected: false,
      status: 404,
      json: async () => ({ error: "session_not_found" })
    });

    await expect(api("/api/workouts/999")).rejects
      .toThrow("session_not_found");
  });
});
