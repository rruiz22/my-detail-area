/**
 * Script de diagnóstico para el Edge Function send-invitation-email
 * Simula una llamada a la función para identificar el error 500
 */

const SUPABASE_URL = "https://swfnnrpzpkdypbrzmgnr.supabase.co";
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-invitation-email`;

// Token de acceso (necesitas estar autenticado)
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY";

// Datos de prueba
const testPayload = {
  invitationId: "00000000-0000-0000-0000-000000000000", // UUID de prueba
  to: "test@example.com",
  dealershipName: "Test Dealership",
  roleName: "Manager",
  inviterName: "John Doe",
  inviterEmail: "john@testdealership.com",
  invitationToken: "test-token-12345",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
};

async function testEdgeFunction() {
  console.log("🧪 Testing Edge Function: send-invitation-email");
  console.log("📦 Payload:", JSON.stringify(testPayload, null, 2));
  console.log("\n🚀 Sending request...\n");

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey": ANON_KEY
      },
      body: JSON.stringify(testPayload)
    });

    console.log("📊 Response Status:", response.status, response.statusText);
    console.log("📋 Response Headers:");
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const responseText = await response.text();
    console.log("\n📄 Response Body (raw):");
    console.log(responseText);

    try {
      const responseJson = JSON.parse(responseText);
      console.log("\n✅ Parsed JSON Response:");
      console.log(JSON.stringify(responseJson, null, 2));
    } catch (e) {
      console.log("\n⚠️ Response is not valid JSON");
    }

    if (!response.ok) {
      console.error("\n❌ Error Response Details:");
      console.error("Status:", response.status);
      console.error("Body:", responseText);

      // Intentar obtener más detalles del error
      if (responseText.includes("error")) {
        console.error("\n🔍 Error Analysis:");
        if (responseText.includes("RESEND_API_KEY")) {
          console.error("  → Missing RESEND_API_KEY environment variable");
        }
        if (responseText.includes("Supabase configuration")) {
          console.error("  → Missing Supabase configuration");
        }
        if (responseText.includes("Invalid JSON")) {
          console.error("  → Invalid JSON in request body");
        }
        if (responseText.includes("validation")) {
          console.error("  → Validation error in request data");
        }
      }
    } else {
      console.log("\n✅ Success!");
    }

  } catch (error) {
    console.error("\n❌ Request Failed:");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Función auxiliar para verificar los secretos de la Edge Function
async function checkEdgeFunctionSecrets() {
  console.log("\n🔐 Checking Edge Function Environment Variables:");
  console.log("Note: This requires Service Role Key or Admin access");
  console.log("\nRequired variables:");
  console.log("  - RESEND_API_KEY");
  console.log("  - SUPABASE_URL");
  console.log("  - SUPABASE_SERVICE_ROLE_KEY");
  console.log("  - PUBLIC_SITE_URL (optional, defaults to https://dds.mydetailarea.com)");
  console.log("\nTo check these, go to:");
  console.log("  https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/settings/functions");
}

// Ejecutar test
console.log("=" .repeat(80));
console.log("Edge Function Diagnostic Tool");
console.log("=" .repeat(80));
console.log();

testEdgeFunction().then(() => {
  console.log("\n" + "=" .repeat(80));
  checkEdgeFunctionSecrets();
  console.log("=" .repeat(80));
});
