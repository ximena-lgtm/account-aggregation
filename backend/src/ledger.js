import { LedgerSdk } from "@minka/ledger-sdk";
import { createHash } from "crypto";
import https from "https";
import http from "http";

// Configuración del ledger (desde variables de entorno o valores por defecto)
const LEDGER_URL = process.env.LEDGER_URL || "https://open-finance-1.ldg-dev.one/api/v2";
const SIGNER_PUBLIC = process.env.SIGNER_PUBLIC || "kao3VT0Hn+AE+f9iA3VnHzy/4k55242D5jBKwnxwFYQ=";
const SIGNER_SECRET = process.env.SIGNER_SECRET || "keSFN3X+LszAem9NOfFE3/tTokEuFzwDYa/8vQpbL/A=";

// SDK instance
const sdk = new LedgerSdk({ server: LEDGER_URL });

// Función para generar pseudónimo HMAC del titular
function generateTitularRef(titularId) {
  // Generar un hash SHA256 válido del titular ID
  // El titular ID puede ser el application_id o cualquier identificador único
  const hmac = createHash("sha256")
    .update(String(titularId))
    .digest("hex"); // Resultado: 64 caracteres hexadecimales
  return `hmac_sha256_${hmac}`;
}

// Función para generar hash de token
function hashToken(token) {
  const hash = createHash("sha256").update(token).digest("hex");
  return `sha256_${hash}`;
}

/**
 * Crea un anchor de consentimiento en el ledger
 * @param {Object} consentData - Datos del consentimiento
 * @returns {Promise<Object>} - Resultado del anchor creado
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

  // Calcular fecha de expiración
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + duration_days);

  // Generar titular reference (pseudonymized) - solo para compliance
  const titularRef = generateTitularRef(titular_id);

  // Wallet corto usando el application_id directamente
  const walletId = `wallet_${titular_id}`;

  try {
    const result = await sdk.anchor
      .init()
      .data({
        handle: consent_id,
        schema: "of-consent-v1",
        wallet: walletId, // Identificador corto
        target: tpp_id, // TPP (Openbank)
        source: data_provider_id, // Data Provider (el banco)
        symbol: "cop",
        // amount no se incluye para el schema of-consent-v1
        custom: {
          // Campos obligatorios según schema of-consent-v1
          consent_id: consent_id,
          tpp_id: tpp_id,
          tpp_legal_name: "Openbank S.A.S., Bogotá, Colombia",
          data_provider_id: data_provider_id,
          titular_ref: titularRef,
          data_scope: scopes,
          purpose: {
            code: "CREDIT_RISK_ASSESSMENT",
            text: purpose || "Evaluación de riesgo crediticio para determinar viabilidad de préstamo personal",
          },
          treatment: {
            storage_permission: "DURATION_BOUND",
            data_retention_days: duration_days,
            mode: "STORE",
          },
          commercialization: {
            flag: false,
            compensation_offered: false,
          },
          expires_at: expiresAt.toISOString(),

          // Campos opcionales (null en pending)
          granted_at: null,
          sca_method: null,
          double_check_confirmed_at: null,
          tokens: [],
          revoked_at: null,
          revoked_by: null,
          revocation_reason: null,
        },
      })
      .hash()
      .sign([
        {
          keyPair: {
            public: SIGNER_PUBLIC,
            secret: SIGNER_SECRET,
            format: "ed25519-raw",
          },
          custom: {
            labels: [
              "consent",
              `tpp:${tpp_id}`,
              `bank:${data_provider_id}`,
              "status:pending",
            ],
            status: "pending",
            event: "consent.requested",
            timestamp: new Date().toISOString(),
          },
        },
      ])
      .send();

    console.log(`✅ Consent anchor created: ${result.anchor.handle}`);
    return result;
  } catch (error) {
    console.error("❌ Error creating consent anchor:", error.message);
    console.error("   Full error:", JSON.stringify(error, null, 2));
    if (error.response) {
      console.error("   Response:", JSON.stringify(error.response, null, 2));
    }
    throw error;
  }
}

/**
 * Activa un consentimiento en el ledger (cambia de pending a active)
 * @param {string} consentHandle - Handle del anchor
 * @param {string} scaMethod - Método de autenticación usado
 * @returns {Promise<Object>} - Resultado del anchor actualizado
 */
export async function activateConsentAnchor(consentHandle, scaMethod = "password+otp") {
  try {
    // 1. Leer anchor actual
    const currentRecord = await sdk.anchor.read(consentHandle);

    if (!currentRecord.anchor.custom) {
      throw new Error("Anchor does not have custom data");
    }

    // 2. Simular tokens
    const accessToken = `access_token_${Date.now()}`;
    const refreshToken = `refresh_token_${Date.now()}`;
    const now = new Date().toISOString();
    const accessTokenExpiresAt = new Date();
    accessTokenExpiresAt.setMinutes(accessTokenExpiresAt.getMinutes() + 15);

    // 3. Agregar proof de activación SIN modificar anchor.data
    // Para of-consent-v1, los datos de activación van en proof.custom, NO en anchor.custom
    const result = await sdk.anchor
      .from({
        data: currentRecord.anchor,
        hash: currentRecord.hash,
        meta: currentRecord.meta,
        luid: currentRecord.luid
      })
      .sign([
        {
          keyPair: {
            public: SIGNER_PUBLIC,
            secret: SIGNER_SECRET,
            format: "ed25519-raw",
          },
          custom: {
            // Status y evento principal
            status: "active",
            event: "consent.activated",
            timestamp: now,

            // Labels para búsqueda
            labels: [
              "consent",
              `tpp:${currentRecord.anchor.target}`,
              `bank:${currentRecord.anchor.custom.data_provider_id}`,
              "status:active",
            ],

            // Datos de activación (van aquí en el proof, no en anchor.custom)
            granted_at: now,
            sca_method: scaMethod,
            double_check_confirmed_at: now,

            // Tokens (van en el proof según of-consent-v1 spec)
            tokens: [
              {
                type: "access",
                hash: hashToken(accessToken),
                issued_at: now,
                expires_at: accessTokenExpiresAt.toISOString(),
                revoked_at: null,
              },
              {
                type: "refresh",
                hash: hashToken(refreshToken),
                issued_at: now,
                expires_at: currentRecord.anchor.custom.expires_at,
                revoked_at: null,
              },
            ],

            // Actor que realiza la activación
            actor: currentRecord.anchor.custom.data_provider_id,
            titular_decision: "approved"
          },
        },
      ])
      .send();

    console.log(`✅ Consent activated: ${result.anchor.handle}`);
    console.log(`   New status: ${result.meta.status}`);
    return result;
  } catch (error) {
    console.error("❌ Error activating consent:", error.message);
    console.error("   Full error:", JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Revoca un consentimiento en el ledger
 * @param {string} consentHandle - Handle del anchor
 * @param {string} reason - Razón de revocación
 * @returns {Promise<Object>} - Resultado del anchor actualizado
 */
export async function revokeConsentAnchor(consentHandle, reason = "User revoked") {
  try {
    const currentRecord = await sdk.anchor.read(consentHandle);

    if (!currentRecord.anchor.custom) {
      throw new Error("Anchor does not have custom data");
    }

    const now = new Date().toISOString();

    // Agregar proof de revocación SIN modificar anchor.data
    const result = await sdk.anchor
      .from({
        data: currentRecord.anchor,
        hash: currentRecord.hash,
        meta: currentRecord.meta,
        luid: currentRecord.luid
      })
      .sign([
        {
          keyPair: {
            public: SIGNER_PUBLIC,
            secret: SIGNER_SECRET,
            format: "ed25519-raw",
          },
          custom: {
            // Status y evento
            status: "revoked",
            event: "consent.revoked",
            timestamp: now,

            // Labels
            labels: [
              "consent",
              `tpp:${currentRecord.anchor.target}`,
              `bank:${currentRecord.anchor.custom.data_provider_id}`,
              "status:revoked",
            ],

            // Datos de revocación (van en proof.custom)
            revoked_at: now,
            revoked_by: "titular",
            revocation_reason: reason,

            // Actor
            actor: "titular"
          },
        },
      ])
      .send();

    console.log(`✅ Consent revoked: ${result.anchor.handle}`);
    return result;
  } catch (error) {
    console.error("❌ Error revoking consent:", error.message);
    throw error;
  }
}

/**
 * Lee un anchor de consentimiento del ledger
 * @param {string} consentHandle - Handle del anchor
 * @returns {Promise<Object>} - Anchor del ledger
 */
export async function readConsentAnchor(consentHandle) {
  try {
    return await sdk.anchor.read(consentHandle);
  } catch (error) {
    console.error("❌ Error reading consent:", error.message);
    throw error;
  }
}
