import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TTL = 60 * 60 * 24; // 24h

const BANKS = [
  { id: "bancolombia",  name: "Bancolombia",           brand: "bancolombia", color: "#FFD100", type: "banco",    display_order: 1,  enabled: 1 },
  { id: "nu",           name: "Nu",                    brand: "nu",          color: "#820AD1", type: "banco",    display_order: 2,  enabled: 1 },
  { id: "daviplata",    name: "Daviplata",              brand: "daviplata",   color: "#ED1C27", type: "billetera",display_order: 3,  enabled: 1 },
  { id: "nequi",        name: "Nequi",                  brand: "nequi",       color: "#F71963", type: "billetera",display_order: 4,  enabled: 1 },
  { id: "bbva",         name: "BBVA",                   brand: "bbva",        color: "#072146", type: "banco",    display_order: 5,  enabled: 1 },
  { id: "davivienda",   name: "Davivienda",             brand: "davivienda",  color: "#ED1C24", type: "banco",    display_order: 6,  enabled: 1 },
  { id: "scotiabank",   name: "Scotiabank Colpatria",   brand: "scotiabank",  color: "#ED1C24", type: "banco",    display_order: 7,  enabled: 1 },
  { id: "avvillas",     name: "Banco AV Villas",        brand: "avvillas",    color: "#00A94F", type: "banco",    display_order: 8,  enabled: 1 },
  { id: "occidente",    name: "Banco de Occidente",     brand: "occidente",   color: "#003DA5", type: "banco",    display_order: 9,  enabled: 1 },
  { id: "popular",      name: "Banco Popular",          brand: "popular",     color: "#C8102E", type: "banco",    display_order: 10, enabled: 1 },
  { id: "bogota",       name: "Banco de Bogotá",        brand: "bogota",      color: "#003DA5", type: "banco",    display_order: 11, enabled: 1 },
  { id: "pichincha",    name: "Banco Pichincha",        brand: "pichincha",   color: "#FFD100", type: "banco",    display_order: 12, enabled: 1 },
  { id: "caja_social",  name: "Banco Caja Social",      brand: "caja_social", color: "#00A651", type: "banco",    display_order: 13, enabled: 1 },
];

function generateId(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let result = "";
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

const db = {
  // Banks son estáticos — no necesitan Redis
  getBanks: () => BANKS.filter((b) => b.enabled),
  getBank: (id) => BANKS.find((b) => b.id === id),

  // Applications
  createApplication: async (data) => {
    const id = generateId();
    const app = { id, ...data, created_at: new Date().toISOString() };
    await redis.set(`app:${id}`, app, { ex: TTL });
    return app;
  },
  getApplication: async (id) => redis.get(`app:${id}`),
  updateApplication: async (id, data) => {
    const app = await redis.get(`app:${id}`);
    if (!app) return null;
    const updated = { ...app, ...data };
    await redis.set(`app:${id}`, updated, { ex: TTL });
    return updated;
  },

  // Consents
  createConsent: async (data) => {
    const id = generateId();
    const consent = { id, ...data, created_at: new Date().toISOString() };
    await redis.set(`consent:${id}`, consent, { ex: TTL });
    await redis.sadd(`app_consents:${data.application_id}`, id);
    await redis.expire(`app_consents:${data.application_id}`, TTL);
    return consent;
  },
  getConsent: async (id) => redis.get(`consent:${id}`),
  updateConsent: async (id, data) => {
    const consent = await redis.get(`consent:${id}`);
    if (!consent) return null;
    const updated = { ...consent, ...data };
    await redis.set(`consent:${id}`, updated, { ex: TTL });
    return updated;
  },
  deleteConsents: async (applicationId) => {
    const ids = await redis.smembers(`app_consents:${applicationId}`);
    if (ids.length > 0) await Promise.all(ids.map((id) => redis.del(`consent:${id}`)));
    await redis.del(`app_consents:${applicationId}`);
  },
  getConsentsByApplication: async (applicationId) => {
    const ids = await redis.smembers(`app_consents:${applicationId}`);
    if (!ids.length) return [];
    const consents = await Promise.all(ids.map((id) => redis.get(`consent:${id}`)));
    return consents.filter(Boolean);
  },

  // Decisions
  createDecision: async (data) => {
    const id = generateId();
    const decision = { id, ...data, created_at: new Date().toISOString() };
    await redis.set(`decision:${id}`, decision, { ex: TTL });
    await redis.sadd(`app_decisions:${data.application_id}`, id);
    await redis.expire(`app_decisions:${data.application_id}`, TTL);
    return decision;
  },
  getDecisionsByApplication: async (applicationId) => {
    const ids = await redis.smembers(`app_decisions:${applicationId}`);
    if (!ids.length) return [];
    const decisions = await Promise.all(ids.map((id) => redis.get(`decision:${id}`)));
    return decisions.filter(Boolean).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
};

export default db;
