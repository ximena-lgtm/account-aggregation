#!/usr/bin/env node
/**
 * Script para probar el flujo completo de autorización con el ledger
 */

const API_URL = "http://localhost:4000/api";

async function testFlow() {
  console.log("🧪 Iniciando prueba del flujo de consentimiento con Ledger\n");

  try {
    // 1. Crear aplicación
    console.log("1️⃣  Creando aplicación...");
    const appResponse = await fetch(`${API_URL}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const app = await appResponse.json();
    console.log(`   ✅ Aplicación creada: ${app.id}\n`);

    // 2. Seleccionar bancos (Bancolombia y Nu)
    console.log("2️⃣  Seleccionando bancos (Bancolombia y Nu)...");
    const banksResponse = await fetch(`${API_URL}/applications/${app.id}/banks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankIds: ["bancolombia", "nu"] }),
    });
    const { consents } = await banksResponse.json();
    console.log(`   ✅ ${consents.length} consentimientos creados: ${consents.join(", ")}\n`);

    // 3. Autorizar primer consentimiento (Bancolombia)
    const consentId = consents[0];
    console.log(`3️⃣  Autorizando consentimiento de Bancolombia (${consentId})...`);
    console.log("   📱 Simulando OTP: 123456");

    const authResponse = await fetch(`${API_URL}/consents/${consentId}/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "123456" }),
    });

    const authResult = await authResponse.json();

    if (authResult.ledger_error) {
      console.log(`   ⚠️  Error del ledger: ${authResult.ledger_error}`);
      console.log(`   ℹ️  Consentimiento autorizado en BD local pero NO en ledger\n`);
    } else {
      console.log(`   ✅ Consentimiento autorizado!`);
      console.log(`   📄 ID local: ${authResult.id}`);
      console.log(`   🔗 Ledger handle: ${authResult.ledger_handle}`);
      console.log(`   📅 Expira: ${authResult.expires_at}\n`);
    }

    // 4. Autorizar segundo consentimiento (Nu)
    const consentId2 = consents[1];
    console.log(`4️⃣  Autorizando consentimiento de Nu (${consentId2})...`);
    console.log("   📱 Simulando OTP: 654321");

    const authResponse2 = await fetch(`${API_URL}/consents/${consentId2}/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "654321" }),
    });

    const authResult2 = await authResponse2.json();

    if (authResult2.ledger_error) {
      console.log(`   ⚠️  Error del ledger: ${authResult2.ledger_error}`);
      console.log(`   ℹ️  Consentimiento autorizado en BD local pero NO en ledger\n`);
    } else {
      console.log(`   ✅ Consentimiento autorizado!`);
      console.log(`   📄 ID local: ${authResult2.id}`);
      console.log(`   🔗 Ledger handle: ${authResult2.ledger_handle}`);
      console.log(`   📅 Expira: ${authResult2.expires_at}\n`);
    }

    // 5. Ver estado de la aplicación
    console.log("5️⃣  Consultando estado de la aplicación...");
    const stateResponse = await fetch(`${API_URL}/applications/${app.id}`);
    const state = await stateResponse.json();

    const authorizedConsents = state.consents.filter(c => c.status === "authorized");
    console.log(`   ✅ Aplicación ${state.id}`);
    console.log(`   📊 Estado: ${state.status}`);
    console.log(`   ✔️  Consentimientos autorizados: ${authorizedConsents.length}/${state.consents.length}\n`);

    console.log("🎉 Prueba completada exitosamente!\n");
    console.log("📋 Resumen:");
    console.log(`   - Aplicación: ${app.id}`);
    console.log(`   - Bancos conectados: Bancolombia, Nu`);
    console.log(`   - Consentimientos: ${state.consents.length}`);
    console.log(`   - Status: ${state.status}`);

    if (!authResult.ledger_error && !authResult2.ledger_error) {
      console.log("\n🔗 Anchors creados en el ledger:");
      console.log(`   - Bancolombia: ${authResult.ledger_handle}`);
      console.log(`   - Nu: ${authResult2.ledger_handle}`);
    }

  } catch (error) {
    console.error("\n❌ Error en la prueba:", error.message);
    process.exit(1);
  }
}

// Ejecutar
testFlow();
