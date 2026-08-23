export async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options
  });

  if (response.redirected && response.url.includes("/login")) {
    window.location.href = "/login";
    throw new Error("Sessão expirada.");
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body.error || message;
    } catch (_) {}
    throw new Error(message);
  }

  return response;
}
