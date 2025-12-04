/**
 * Script para forzar re-registro de token FCM
 * Ejecutar en la consola del navegador con el usuario rruiz@lima.llc
 *
 * Este script:
 * 1. Elimina todos los tokens FCM antiguos de la base de datos
 * 2. Limpia el localStorage
 * 3. Recarga la página para forzar nuevo registro
 */

(async function forceReregisterFCM() {
  console.log("🔄 Iniciando re-registro de FCM...");

  const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg5MjA5MTgsImV4cCI6MjA0NDQ5NjkxOH0.4JkO1HdtLCpqGQPuwzQfVg2KYnOmQ7uTEE9Nm4z7K38';

  // 1. Obtener access token
  const authToken = localStorage.getItem('sb-swfnnrpzpkdypbrzmgnr-auth-token');
  if (!authToken) {
    console.error("❌ No auth token found. Make sure you're logged in.");
    return;
  }

  const accessToken = JSON.parse(authToken).access_token;
  const userId = JSON.parse(authToken).user.id;

  console.log("👤 User ID:", userId);

  // 2. Desactivar todos los tokens antiguos
  console.log("🗑️ Desactivando tokens antiguos...");

  const deactivateResponse = await fetch(
    `${supabaseUrl}/rest/v1/fcm_tokens?user_id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ is_active: false })
    }
  );

  if (deactivateResponse.ok) {
    console.log("✅ Tokens antiguos desactivados");
  } else {
    console.warn("⚠️ Error desactivando tokens:", await deactivateResponse.text());
  }

  // 3. Limpiar localStorage de FCM
  console.log("🧹 Limpiando localStorage...");
  localStorage.removeItem('fcm_token');
  localStorage.removeItem('fcm_permission_requested');
  localStorage.removeItem('fcm_token_registered');

  console.log("✅ localStorage limpio");

  // 4. Recargar página
  console.log("🔄 Recargando página en 2 segundos...");
  console.log("📱 Después de recargar, el FCM se registrará automáticamente");

  setTimeout(() => {
    location.reload();
  }, 2000);
})();
