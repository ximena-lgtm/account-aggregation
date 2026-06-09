#!/usr/bin/env node
/**
 * Script para listar los schemas disponibles en el ledger
 */

import { LedgerSdk } from "@minka/ledger-sdk";

const LEDGER_URL = process.env.LEDGER_URL || "https://open-finance-1.ldg-dev.one/api/v2";

async function listSchemas() {
  console.log("🔗 Conectando al ledger:", LEDGER_URL);

  const sdk = new LedgerSdk({ server: LEDGER_URL });

  console.log("\n📋 Listando schemas disponibles...\n");

  try {
    const result = await sdk.schema.list();

    if (!result.schemas || result.schemas.length === 0) {
      console.log("   ℹ️  No hay schemas registrados");
      return;
    }

    console.log(`   ✅ ${result.schemas.length} schemas encontrados:\n`);

    result.schemas.forEach((schema) => {
      console.log(`   📄 ${schema.handle}`);
      console.log(`      Record: ${schema.record}`);
      console.log(`      Format: ${schema.format}`);
      console.log();
    });

    return result;
  } catch (error) {
    console.error("\n❌ Error listando schemas:", error.message);
    if (error.response?.data) {
      console.error("   Detalles:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Ejecutar
listSchemas()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
