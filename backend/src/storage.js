// In-memory storage para Vercel (serverless)
// Los datos se reinician en cada deploy, pero los consentimientos importantes están en Minka Ledger

const storage = {
  banks: [],
  applications: new Map(),
  consents: new Map(),
  decisions: new Map(),
};

// Helper para generar IDs únicos
function generateId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// API compatible con SQLite
export const db = {
  // Banks
  getBanks: () => storage.banks.filter(b => b.enabled),
  getBank: (id) => storage.banks.find(b => b.id === id),
  addBank: (bank) => storage.banks.push(bank),

  // Applications
  createApplication: (data) => {
    const id = generateId();
    const app = { id, ...data, created_at: new Date().toISOString() };
    storage.applications.set(id, app);
    return app;
  },
  getApplication: (id) => storage.applications.get(id),
  updateApplication: (id, data) => {
    const app = storage.applications.get(id);
    if (app) {
      Object.assign(app, data);
    }
    return app;
  },

  // Consents
  createConsent: (data) => {
    const id = generateId();
    const consent = { id, ...data, created_at: new Date().toISOString() };
    storage.consents.set(id, consent);
    return consent;
  },
  getConsent: (id) => storage.consents.get(id),
  updateConsent: (id, data) => {
    const consent = storage.consents.get(id);
    if (consent) {
      Object.assign(consent, data);
    }
    return consent;
  },
  deleteConsents: (applicationId) => {
    for (const [id, consent] of storage.consents.entries()) {
      if (consent.application_id === applicationId) {
        storage.consents.delete(id);
      }
    }
  },
  getConsentsByApplication: (applicationId) => {
    return Array.from(storage.consents.values())
      .filter(c => c.application_id === applicationId);
  },

  // Decisions
  createDecision: (data) => {
    const id = generateId();
    const decision = { id, ...data, created_at: new Date().toISOString() };
    storage.decisions.set(id, decision);
    return decision;
  },
  getDecisionsByApplication: (applicationId) => {
    return Array.from(storage.decisions.values())
      .filter(d => d.application_id === applicationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
};

// Inicializar con datos de bancos
export function initializeBanks() {
  const banks = [
    ["bancolombia", "Bancolombia", "bancolombia", "#FFD100", "banco", 1],
    ["nu", "Nu", "nu", "#820AD1", "banco", 2],
    ["daviplata", "Daviplata", "daviplata", "#ED1C27", "billetera", 3],
    ["nequi", "Nequi", "nequi", "#F71963", "billetera", 4],
    ["bbva", "BBVA", "bbva", "#072146", "banco", 5],
    ["davivienda", "Davivienda", "davivienda", "#ED1C24", "banco", 6],
    ["scotiabank", "Scotiabank Colpatria", "scotiabank", "#ED1C24", "banco", 7],
    ["avvillas", "Banco AV Villas", "avvillas", "#00A94F", "banco", 8],
    ["occidente", "Banco de Occidente", "occidente", "#003DA5", "banco", 9],
    ["popular", "Banco Popular", "popular", "#C8102E", "banco", 10],
    ["bogota", "Banco de Bogotá", "bogota", "#003DA5", "banco", 11],
    ["pichincha", "Banco Pichincha", "pichincha", "#FFD100", "banco", 12],
    ["caja_social", "Banco Caja Social", "caja_social", "#00A651", "banco", 13],
  ];

  storage.banks = banks.map(([id, name, brand, color, type, display_order]) => ({
    id,
    name,
    brand,
    color,
    type,
    display_order,
    enabled: 1,
  }));

  console.log(`✅ ${storage.banks.length} bancos cargados en memoria`);
}

// Inicializar automáticamente
initializeBanks();

export default db;
