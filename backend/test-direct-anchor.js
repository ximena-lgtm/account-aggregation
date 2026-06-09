import { LedgerSdk } from "@minka/ledger-sdk";

const sdk = new LedgerSdk({ server: "https://open-finance-1.ldg-dev.one/api/v2" });

const result = await sdk.anchor
  .init()
  .data({
    handle: "consent_test_" + Date.now(),
    schema: "of-consent-v1",
    wallet: "wallet_customer_test",
    target: "tpp_openbank",
    source: "bridge_bancolombia",
    symbol: "cop",
    amount: 1,  // Intentar con 1
    custom: {
      consent_id: "test_123",
      tpp_id: "tpp_openbank",
      tpp_legal_name: "Openbank S.A.S., Bogotá, Colombia",
      data_provider_id: "bridge_bancolombia",
      titular_ref: "hmac_sha256_test123456789",
      data_scope: ["category_1_accounts", "category_2_transactions"],
      purpose: { code: "CREDIT_RISK_ASSESSMENT", text: "Test purpose" },
      treatment: { storage_permission: "DURATION_BOUND", data_retention_days: 90, mode: "STORE" },
      commercialization: { flag: false, compensation_offered: false },
      expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
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
        public: "kao3VT0Hn+AE+f9iA3VnHzy/4k55242D5jBKwnxwFYQ=",
        secret: "keSFN3X+LszAem9NOfFE3/tTokEuFzwDYa/8vQpbL/A=",
        format: "ed25519-raw",
      },
      custom: {
        status: "pending",
        event: "consent.requested",
        timestamp: new Date().toISOString(),
      },
    },
  ])
  .send();

console.log("✅ Success!");
console.log("Handle:", result.anchor.handle);
console.log("LUID:", result.luid);
