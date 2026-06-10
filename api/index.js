import express from "express";
import cors from "cors";
import db from "./storage.js";

const USE_MOCK = process.env.USE_MOCK_LEDGER === "true";
const ledgerModule = USE_MOCK ? "../backend/src/ledger-mock.js" : "../backend/src/ledger.js";
const { createConsentAnchor, activateConsentAnchor, revokeConsentAnchor } = await import(ledgerModule);

const app = express();
app.use(cors());
app.use(express.json());

const daysFromNow = (d) => new Date(Date.now() + d * 864e5).toISOString();

const DEFAULT_SCOPES = {
  bancolombia: [
    "Saldo cuenta corriente *4521",
    "Saldo cuenta de ahorros *8834",
    "Movimientos · últimos 90 días",
    "Datos de identificación (KYC)"
  ],
  nu: [
    "Saldo cuenta Nu *9012",
    "Movimientos · últimos 90 días",
    "Datos de identificación (KYC)"
  ],
  daviplata: [
    "Saldo cuenta Daviplata *7823",
    "Movimientos · últimos 90 días",
    "Datos de identificación (KYC)"
  ],
  generic: [
    "Saldo de cuentas",
    "Movimientos · últimos 90 días",
    "Datos de identificación (KYC)"
  ]
};
const PURPOSE = "Evaluación crediticia · 90 días · Revocable";

app.get("/api/banks", (req, res) => {
  const banks = db.getBanks().sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
  res.json({ count: banks.length, banks });
});

app.post("/api/applications", async (req, res) => {
  const application = await db.createApplication({ status: "draft" });
  res.status(201).json({ id: application.id, status: application.status });
});

app.post("/api/applications/:id/banks", async (req, res) => {
  const appRow = await db.getApplication(req.params.id);
  if (!appRow) return res.status(404).json({ error: "Solicitud no encontrada" });
  const { bankIds } = req.body;
  if (!Array.isArray(bankIds) || bankIds.length === 0)
    return res.status(400).json({ error: "Selecciona al menos un banco" });

  await db.deleteConsents(appRow.id);
  const created = [];

  for (const bankId of bankIds) {
    const bank = db.getBank(bankId);
    if (!bank) continue;
    const scopes = DEFAULT_SCOPES[bank.brand] || DEFAULT_SCOPES.generic;

    try {
      const formattedScopes = scopes.map((scope, index) => {
        const normalized = scope.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "_");
        return `category_${index + 1}_${normalized}`;
      });

      const consent = await db.createConsent({
        application_id: appRow.id,
        bank_id: bankId,
        scopes: JSON.stringify(scopes),
        purpose: PURPOSE,
        status: "pending",
        expires_at: null,
        ledger_handle: null,
      });

      const consentHandle = `consent_${consent.id}_${Date.now()}`;
      await createConsentAnchor({
        consent_id: consentHandle,
        tpp_id: "tpp_openbank",
        data_provider_id: `bridge_${bankId}`,
        titular_id: appRow.id,
        scopes: formattedScopes,
        purpose: PURPOSE,
        duration_days: 90,
      });

      await db.updateConsent(consent.id, { ledger_handle: consentHandle });
      created.push(consent.id);
    } catch (error) {
      console.error(`Error creating consent in ledger:`, error.message);
      const consent = await db.createConsent({
        application_id: appRow.id,
        bank_id: bankId,
        scopes: JSON.stringify(scopes),
        purpose: PURPOSE,
        status: "pending",
        expires_at: null,
        ledger_handle: null,
      });
      created.push(consent.id);
    }
  }

  await db.updateApplication(appRow.id, { status: "banks_selected" });
  res.status(201).json({ applicationId: appRow.id, consents: created });
});

app.get("/api/consents/:id", async (req, res) => {
  const c = await db.getConsent(req.params.id);
  if (!c) return res.status(404).json({ error: "Consentimiento no encontrado" });
  const bank = db.getBank(c.bank_id);
  res.json({ ...c, scopes: JSON.parse(c.scopes), bank });
});

app.post("/api/consents/:id/authorize", async (req, res) => {
  const c = await db.getConsent(req.params.id);
  if (!c) return res.status(404).json({ error: "Consentimiento no encontrado" });

  const { otp } = req.body || {};
  if (!otp || !/^\d{6}$/.test(String(otp)))
    return res.status(401).json({ error: "Código OTP inválido (6 dígitos)" });

  try {
    if (!c.ledger_handle) {
      return res.status(400).json({ error: "Consentimiento no tiene anchor en el ledger." });
    }
    await activateConsentAnchor(c.ledger_handle, "password+otp");
    const expiresAt = daysFromNow(90);
    await db.updateConsent(c.id, { status: "authorized", expires_at: expiresAt });
    res.json({ id: c.id, status: "authorized", expires_at: expiresAt, ledger_handle: c.ledger_handle });
  } catch (error) {
    console.error("Error activating consent in ledger:", error.message);
    const expiresAt = daysFromNow(90);
    await db.updateConsent(c.id, { status: "authorized", expires_at: expiresAt });
    res.json({ id: c.id, status: "authorized", expires_at: expiresAt, ledger_error: error.message });
  }
});

app.post("/api/consents/:id/deny", async (req, res) => {
  const c = await db.getConsent(req.params.id);
  if (!c) return res.status(404).json({ error: "Consentimiento no encontrado" });
  await db.updateConsent(c.id, { status: "denied" });
  res.json({ id: c.id, status: "denied" });
});

app.post("/api/applications/:id/evaluate", async (req, res) => {
  const appRow = await db.getApplication(req.params.id);
  if (!appRow) return res.status(404).json({ error: "Solicitud no encontrada" });
  const consents = await db.getConsentsByApplication(appRow.id);
  const authorized = consents.filter((c) => c.status === "authorized");
  if (authorized.length === 0)
    return res.status(400).json({ error: "No hay consentimientos autorizados" });

  let amount = 1500000 * authorized.length;
  if (authorized.some((c) => c.bank_id === "bancolombia")) amount += 2000000;
  amount = Math.min(amount, 8000000);
  const approved = amount >= 1500000;

  const rate = 1.8;
  const term = 24;
  const monthly = Math.round(
    (amount * (rate / 100) * Math.pow(1 + rate / 100, term)) /
    (Math.pow(1 + rate / 100, term) - 1)
  );
  const bankNames = authorized.map((c) => db.getBank(c.bank_id)?.name).filter(Boolean).join(" y ");

  const decision = await db.createDecision({
    application_id: appRow.id,
    approved: approved ? 1 : 0,
    amount,
    currency: "COP",
    rate,
    term_months: term,
    monthly_payment: monthly,
    first_payment: daysFromNow(30).slice(0, 10),
    rationale: `Cupo calculado con base en tu historial de ${bankNames} via Open Finance.`,
  });

  await db.updateApplication(appRow.id, { status: approved ? "approved" : "denied" });

  res.json({
    id: decision.id,
    applicationId: appRow.id,
    approved,
    amount,
    currency: "COP",
    rate,
    term_months: term,
    monthly_payment: monthly,
    first_payment: daysFromNow(30).slice(0, 10),
    rationale: `Cupo calculado con base en tu historial de ${bankNames} via Open Finance.`,
    expires_in_days: 89,
  });
});

app.get("/api/applications/:id", async (req, res) => {
  const appRow = await db.getApplication(req.params.id);
  if (!appRow) return res.status(404).json({ error: "Solicitud no encontrada" });
  const consents = await db.getConsentsByApplication(appRow.id);
  const mappedConsents = consents.map((c) => ({ ...c, scopes: JSON.parse(c.scopes), bank: db.getBank(c.bank_id) }));
  const decisions = await db.getDecisionsByApplication(appRow.id);
  res.json({ ...appRow, consents: mappedConsents, decision: decisions[0] });
});

export default app;
