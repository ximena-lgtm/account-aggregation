#!/usr/bin/env node
/**
 * Script para registrar el schema de consentimientos en el ledger
 */

import { LedgerSdk } from "@minka/ledger-sdk";
import { readFileSync } from "fs";

const LEDGER_URL = process.env.LEDGER_URL || "https://open-finance-1.ldg-dev.one/api/v2";
const SIGNER_PUBLIC = process.env.SIGNER_PUBLIC || "kao3VT0Hn+AE+f9iA3VnHzy/4k55242D5jBKwnxwFYQ=";
const SIGNER_SECRET = process.env.SIGNER_SECRET || "keSFN3X+LszAem9NOfFE3/tTokEuFzwDYa/8vQpbL/A=";

async function registerSchema() {
  console.log("🔗 Conectando al ledger:", LEDGER_URL);

  const sdk = new LedgerSdk({ server: LEDGER_URL });

  // Leer el schema JSON
  const schemaJson = JSON.parse(readFileSync("./schema-consent.json", "utf8"));

  console.log("\n📝 Registrando schema: consent-1");

  try {
    const result = await sdk.schema
      .init()
      .data({
        handle: "consent-1",
        record: "anchor",
        format: "json-schema",
        schema: schemaJson,
      })
      .sign([
        {
          keyPair: {
            public: SIGNER_PUBLIC,
            secret: SIGNER_SECRET,
            format: "ed25519-raw",
          },
        },
      ])
      .send();

    console.log("\n✅ Schema registrado exitosamente!");
    console.log("   Handle:", result.schema.handle);
    console.log("   Record:", result.schema.record);
    console.log("   Format:", result.schema.format);

    return result;
  } catch (error) {
    console.error("\n❌ Error registrando schema:", error.message);
    if (error.response?.data) {
      console.error("   Detalles:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Ejecutar
registerSchema()
  .then(() => {
    console.log("\n🎉 Schema registrado. Ahora puedes crear anchors con schema: 'consent-1'");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Falló el registro del schema");
    process.exit(1);
  });
