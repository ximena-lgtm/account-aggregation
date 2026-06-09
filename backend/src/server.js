import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import db from "./db.js";

// Usar mock del ledger si USE_MOCK_LEDGER=true o si el ledger real falla
const USE_MOCK = process.env.USE_MOCK_LEDGER === "true";
const ledgerModule = USE_MOCK ? "./ledger-mock.js" : "./ledger.js";

console.log(`📝 Using ${USE_MOCK ? "MOCK" : "REAL"} ledger`);

const { createConsentAnchor, activateConsentAnchor, revokeConsentAnchor } = await import(ledgerModule);

const app = express();
app.use(cors());
app.use(express.json());

const now = () => new Date().toISOString();
const daysFromNow = (d) => new Date(Date.now() + d * 864e5).toISOString();

// Scopes y propósito estándar AISP (Decreto 368/2026)
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

// ---- Directorio SFC ----
app.get("/api/banks", (req, res) => {
  const rows = db.prepare("SELECT * FROM banks WHERE enabled = 1 ORDER BY display_order, name").all();
  res.json({ count: rows.length, banks: rows });
});

// ---- Crear solicitud de crédito ----
app.post("/api/applications", (req, res) => {
  const id = nanoid(10);
  db.prepare("INSERT INTO applications (id,status,created_at) VALUES (?,?,?)").run(id, "draft", now());
  res.status(201).json({ id, status: "draft" });
});

// ---- Seleccionar bancos -> crea consents en estado pending ----
app.post("/api/applications/:id/banks", async (req, res) => {
  const appRow = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!appRow) return res.status(404).json({ error: "Solicitud no encontrada" });
  const { bankIds } = req.body;
  if (!Array.isArray(bankIds) || bankIds.length === 0)
    return res.status(400).json({ error: "Selecciona al menos un banco" });

  db.prepare("DELETE FROM consents WHERE application_id = ?").run(appRow.id);
  const ins = db.prepare(
    "INSERT INTO consents (id,application_id,bank_id,scopes,purpose,status,expires_at,created_at,ledger_handle) VALUES (?,?,?,?,?,?,?,?,?)"
  );
  const created = [];

  for (const bankId of bankIds) {
    const bank = db.prepare("SELECT * FROM banks WHERE id = ?").get(bankId);
    if (!bank) continue;
    const scopes = DEFAULT_SCOPES[bank.brand] || DEFAULT_SCOPES.generic;
    const cid = nanoid(10);

    try {
      // Convertir scopes al formato requerido por el schema
      const formattedScopes = scopes.map((scope, index) => {
        const normalized = scope
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .trim()
          .replace(/\s+/g, '_');
        return `category_${index + 1}_${normalized}`;
      });

      // Crear anchor en el ledger (estado pending)
      const consentHandle = `consent_${cid}_${Date.now()}`;
      await createConsentAnchor({
        consent_id: consentHandle,
        tpp_id: "tpp_openbank",
        data_provider_id: `bridge_${bankId}`,
        titular_id: appRow.id,
        scopes: formattedScopes,
        purpose: PURPOSE,
        duration_days: 90,
      });

      // Guardar en BD con el ledger handle
      ins.run(cid, appRow.id, bankId, JSON.stringify(scopes), PURPOSE, "pending", null, now(), consentHandle);
      created.push(cid);
      console.log(`✅ Consent ${cid} created in ledger as ${consentHandle} (pending)`);
    } catch (error) {
      console.error(`❌ Error creating consent ${cid} in ledger:`, error.message);
      // Aun si falla el ledger, creamos el consent en BD local
      ins.run(cid, appRow.id, bankId, JSON.stringify(scopes), PURPOSE, "pending", null, now(), null);
      created.push(cid);
    }
  }

  db.prepare("UPDATE applications SET status = 'banks_selected' WHERE id = ?").run(appRow.id);
  res.status(201).json({ applicationId: appRow.id, consents: created });
});

// ---- Detalle de un consentimiento (para SCA / Consent Confirm) ----
app.get("/api/consents/:id", (req, res) => {
  const c = db.prepare("SELECT * FROM consents WHERE id = ?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "Consentimiento no encontrado" });
  const bank = db.prepare("SELECT * FROM banks WHERE id = ?").get(c.bank_id);
  res.json({ ...c, scopes: JSON.parse(c.scopes), bank });
});

// ---- Autenticación fuerte (SCA) + autorización del consentimiento ----
app.post("/api/consents/:id/authorize", async (req, res) => {
  const c = db.prepare("SELECT * FROM consents WHERE id = ?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "Consentimiento no encontrado" });

  const { otp } = req.body || {};
  // SCA simulada: cualquier OTP de 6 dígitos es válido
  if (!otp || !/^\d{6}$/.test(String(otp)))
    return res.status(401).json({ error: "Código OTP inválido (6 dígitos)" });

  try {
    // Verificar que el consent tenga un ledger_handle
    if (!c.ledger_handle) {
      return res.status(400).json({
        error: "Consentimiento no tiene anchor en el ledger. Debe crearse primero al seleccionar el banco."
      });
    }

    // Activar el anchor existente en el ledger (cambiar de pending a active)
    await activateConsentAnchor(c.ledger_handle, "password+otp");

    // Actualizar BD local
    db.prepare("UPDATE consents SET status='authorized', expires_at=? WHERE id=?").run(daysFromNow(90), c.id);

    console.log(`✅ Consent ${c.id} activated in ledger: ${c.ledger_handle} (pending → active)`);
    res.json({
      id: c.id,
      status: "authorized",
      expires_at: daysFromNow(90),
      ledger_handle: c.ledger_handle
    });
  } catch (error) {
    console.error("❌ Error activating consent in ledger:", error.message);
    // Aun si falla el ledger, autorizamos en la BD local
    db.prepare("UPDATE consents SET status='authorized', expires_at=? WHERE id=?").run(daysFromNow(90), c.id);
    res.json({
      id: c.id,
      status: "authorized",
      expires_at: daysFromNow(90),
      ledger_error: error.message
    });
  }
});

app.post("/api/consents/:id/deny", (req, res) => {
  const c = db.prepare("SELECT * FROM consents WHERE id = ?").get(req.params.id);
  if (!c) return res.status(404).json({ error: "Consentimiento no encontrado" });
  db.prepare("UPDATE consents SET status='denied' WHERE id=?").run(c.id);
  res.json({ id: c.id, status: "denied" });
});

// ---- Evaluación (Hub normaliza + decisión) ----
app.post("/api/applications/:id/evaluate", (req, res) => {
  const appRow = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!appRow) return res.status(404).json({ error: "Solicitud no encontrada" });
  const consents = db.prepare("SELECT * FROM consents WHERE application_id = ?").all(appRow.id);
  const authorized = consents.filter((c) => c.status === "authorized");
  if (authorized.length === 0)
    return res.status(400).json({ error: "No hay consentimientos autorizados" });

  // Modelo simple: base por banco autorizado + bonus por Bancolombia
  let amount = 1500000 * authorized.length;
  if (authorized.some((c) => c.bank_id === "bancolombia")) amount += 2000000;
  amount = Math.min(amount, 8000000);
  const approved = amount >= 1500000;

  const rate = 1.8; // % mensual
  const term = 24;
  const monthly = Math.round((amount * (rate / 100) * Math.pow(1 + rate / 100, term)) /
    (Math.pow(1 + rate / 100, term) - 1));
  const bankNames = authorized
    .map((c) => db.prepare("SELECT name FROM banks WHERE id=?").get(c.bank_id)?.name)
    .filter(Boolean)
    .join(" y ");

  const did = nanoid(10);
  db.prepare(
    `INSERT INTO decisions (id,application_id,approved,amount,currency,rate,term_months,monthly_payment,first_payment,rationale,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(did, appRow.id, approved ? 1 : 0, amount, "COP", rate, term, monthly,
    daysFromNow(30).slice(0, 10),
    `Cupo calculado con base en tu historial de ${bankNames} via Open Finance.`, now());
  db.prepare("UPDATE applications SET status=? WHERE id=?").run(approved ? "approved" : "denied", appRow.id);

  res.json({
    id: did, applicationId: appRow.id, approved, amount, currency: "COP",
    rate, term_months: term, monthly_payment: monthly,
    first_payment: daysFromNow(30).slice(0, 10),
    rationale: `Cupo calculado con base en tu historial de ${bankNames} via Open Finance.`,
    expires_in_days: 89
  });
});

// ---- Estado completo de la solicitud ----
app.get("/api/applications/:id", (req, res) => {
  const appRow = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!appRow) return res.status(404).json({ error: "Solicitud no encontrada" });
  const consents = db.prepare("SELECT * FROM consents WHERE application_id = ?").all(appRow.id)
    .map((c) => ({ ...c, scopes: JSON.parse(c.scopes), bank: db.prepare("SELECT * FROM banks WHERE id=?").get(c.bank_id) }));
  const decision = db.prepare("SELECT * FROM decisions WHERE application_id = ? ORDER BY created_at DESC").get(appRow.id);
  res.json({ ...appRow, consents, decision });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Open Finance AISP backend en http://localhost:${PORT}`));
