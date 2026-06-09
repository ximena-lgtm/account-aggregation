import { createHash } from "crypto";

// Mock del ledger para desarrollo/testing cuando el ledger real no está disponible
const mockAnchors = new Map();

// Función para generar pseudónimo HMAC del titular
function generateTitularRef(titularId) {
  const hmac = createHash("sha256").update(titularId).digest("hex");
  return `hmac_sha256_${hmac}`;
}

// Función para generar hash de token
function hashToken(token) {
  const hash = createHash("sha256").update(token).digest("hex");
  return `sha256_${hash}`;
}

/**
 * Crea un anchor de consentimiento (mock)
 */
export async function createConsentAnchor(consentData) {
  const {
    consent_id,
    tpp_id,
    data_provider_id,
    titular_id,
    scopes,
    purpose,
    duration_days,
  } = consentData;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + duration_days);
  const titularRef = generateTitularRef(titular_id);

  const anchor = {
    handle: consent_id,
    schema: "of-consent-v1",
    wallet: titularRef,
    target: tpp_id,
    source: data_provider_id,
    custom: {
      consent_id,
      tpp_id,
      tpp_legal_name: "Openbank S.A.S., Bogotá, Colombia",
      data_provider_id,
      data_provider_source: data_provider_id,
      titular_ref: titularRef,
      data_scope: scopes,
      purpose,
      duration_days,
      commercialization_flag: false,
      compensation_flag: false,
      expires_at: expiresAt.toISOString(),
      granted_at: null,
      sca_method: null,
      double_check_confirmed_at: null,
      access_token_hash: null,
      refresh_token_hash: null,
      token_expires_at: null,
      revoked_at: null,
      revoked_by: null,
      revocation_reason: null,
    },
    proofs: [
      {
        status: "pending",
        event: "consent.requested",
        timestamp: new Date().toISOString(),
        labels: [
          "consent",
          `tpp:${tpp_id}`,
          `bank:${data_provider_id}`,
          "status:pending",
        ],
      },
    ],
  };

  mockAnchors.set(consent_id, anchor);
  console.log(`✅ [MOCK] Consent anchor created: ${consent_id}`);

  return {
    anchor,
    hash: createHash("sha256").update(JSON.stringify(anchor)).digest("hex"),
    luid: `luid_${Date.now()}`,
    meta: {
      status: "pending",
      proofs: anchor.proofs,
    },
  };
}

/**
 * Activa un consentimiento (mock)
 */
export async function activateConsentAnchor(consentHandle, scaMethod = "password+otp") {
  const anchor = mockAnchors.get(consentHandle);
  if (!anchor) {
    throw new Error("Anchor not found");
  }

  const now = new Date().toISOString();
  const accessToken = `access_token_${Date.now()}`;
  const refreshToken = `refresh_token_${Date.now()}`;
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 1);

  anchor.custom = {
    ...anchor.custom,
    granted_at: now,
    sca_method: scaMethod,
    double_check_confirmed_at: now,
    access_token_hash: hashToken(accessToken),
    refresh_token_hash: hashToken(refreshToken),
    token_expires_at: tokenExpiresAt.toISOString(),
  };

  anchor.proofs.push({
    status: "active",
    event: "consent.activated",
    timestamp: now,
    labels: [
      "consent",
      `tpp:${anchor.target}`,
      `bank:${anchor.custom.data_provider_id}`,
      "status:active",
    ],
  });

  console.log(`✅ [MOCK] Consent activated: ${consentHandle}`);

  return {
    anchor,
    hash: createHash("sha256").update(JSON.stringify(anchor)).digest("hex"),
    meta: {
      status: "active",
      proofs: anchor.proofs,
    },
  };
}

/**
 * Revoca un consentimiento (mock)
 */
export async function revokeConsentAnchor(consentHandle, reason = "User revoked") {
  const anchor = mockAnchors.get(consentHandle);
  if (!anchor) {
    throw new Error("Anchor not found");
  }

  const now = new Date().toISOString();

  anchor.custom = {
    ...anchor.custom,
    revoked_at: now,
    revoked_by: "titular",
    revocation_reason: reason,
  };

  anchor.proofs.push({
    status: "revoked",
    event: "consent.revoked",
    timestamp: now,
    reason,
    labels: [
      "consent",
      `tpp:${anchor.target}`,
      `bank:${anchor.custom.data_provider_id}`,
      "status:revoked",
    ],
  });

  console.log(`✅ [MOCK] Consent revoked: ${consentHandle}`);

  return {
    anchor,
    hash: createHash("sha256").update(JSON.stringify(anchor)).digest("hex"),
    meta: {
      status: "revoked",
      proofs: anchor.proofs,
    },
  };
}

/**
 * Lee un anchor (mock)
 */
export async function readConsentAnchor(consentHandle) {
  const anchor = mockAnchors.get(consentHandle);
  if (!anchor) {
    throw new Error("Anchor not found");
  }

  return {
    anchor,
    hash: createHash("sha256").update(JSON.stringify(anchor)).digest("hex"),
    meta: {
      status: anchor.proofs[anchor.proofs.length - 1].status,
      proofs: anchor.proofs,
    },
  };
}

/**
 * Lista todos los anchors (mock)
 */
export function listAllAnchors() {
  return Array.from(mockAnchors.values());
}

/**
 * Limpia todos los anchors (mock)
 */
export function clearAllAnchors() {
  mockAnchors.clear();
  console.log("✅ [MOCK] All anchors cleared");
}
