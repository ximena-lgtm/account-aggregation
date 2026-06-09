const base = "/api";

async function req(path, opts = {}) {
  const res = await fetch(base + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error de red");
  return data;
}

export const api = {
  getBanks: () => req("/banks"),
  createApplication: () => req("/applications", { method: "POST" }),
  selectBanks: (appId, bankIds) =>
    req(`/applications/${appId}/banks`, { method: "POST", body: { bankIds } }),
  getConsent: (id) => req(`/consents/${id}`),
  authorizeConsent: (id, otp) =>
    req(`/consents/${id}/authorize`, { method: "POST", body: { otp } }),
  denyConsent: (id) => req(`/consents/${id}/deny`, { method: "POST" }),
  evaluate: (appId) => req(`/applications/${appId}/evaluate`, { method: "POST" }),
  getApplication: (appId) => req(`/applications/${appId}`)
};
