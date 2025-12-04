# 🔍 Diagnóstico FCM - Push Notifications

## IMPORTANTE: Ejecutar en la ventana de rruiz@lima.llc (NO bosdetail)

### Paso 1: Verificar Inicialización FCM

Abre la consola del navegador con **rruiz@lima.llc** y busca estos mensajes:

```
✅ Buscar: "🔥 Firebase Cloud Messaging initialized successfully"
✅ Buscar: "[FCM] Token registered successfully"
✅ Buscar: "[FCM] Listener attached for foreground messages"
```

Si NO ves estos mensajes, significa que `useFirebaseMessaging` NO se está ejecutando.

---

### Paso 2: Ejecutar Script de Diagnóstico

Copia y pega este código en la **consola de rruiz@lima.llc**:

```javascript
(async () => {
  console.log("=== DIAGNÓSTICO FCM ===");

  // 1. Verificar soporte de notificaciones
  console.log("1. Notification supported:", "Notification" in window);
  console.log("2. Notification permission:", Notification.permission);

  // 3. Verificar Service Worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log("3. Service Workers registrados:", registrations.length);

    registrations.forEach((reg, i) => {
      const sw = reg.active || reg.installing || reg.waiting;
      console.log(`   SW ${i+1}:`, sw?.scriptURL);
      console.log(`   Estado:`, reg.active ? "activo" : "inactivo");
    });
  }

  // 4. Verificar tokens FCM en Supabase
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const supabase = createClient(
    'https://swfnnrpzpkdypbrzmgnr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg5MjA5MTgsImV4cCI6MjA0NDQ5NjkxOH0.4JkO1HdtLCpqGQPuwzQfVg2KYnOmQ7uTEE9Nm4z7K38'
  );

  const { data: { user } } = await supabase.auth.getUser();
  console.log("4. User ID:", user?.id);
  console.log("   Email:", user?.email);

  if (user?.id) {
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', user.id);

    console.log("5. Tokens FCM registrados:", tokens?.length || 0);
    tokens?.forEach((token, i) => {
      console.log(`   Token ${i+1}:`, token.token.substring(0, 20) + "...");
      console.log(`   Dispositivo:`, token.device_type);
      console.log(`   Creado:`, new Date(token.created_at).toLocaleString());
    });

    if (error) console.error("   Error:", error);
  }

  // 6. Test manual de notificación
  console.log("\n6. Probando notificación manual...");
  if (Notification.permission === "granted") {
    new Notification("Test Manual", {
      body: "Si ves esto, las notificaciones funcionan",
      icon: "/favicon-mda.svg"
    });
    console.log("   ✅ Notificación manual enviada");
  } else {
    console.log("   ❌ Permiso no concedido");
  }

  console.log("\n=== FIN DIAGNÓSTICO ===");
})();
```

---

### Paso 3: Analizar Resultados

**Escenario 1: No hay logs de inicialización**
- Problema: `useFirebaseMessaging` no se está ejecutando
- Causa: `FirebaseMessagingProvider` no está montado o hay error en mount

**Escenario 2: Tokens FCM = 0 o tokens inválidos**
- Problema: No hay tokens registrados para este dispositivo
- Solución: Ir a Settings → Notifications → Enable Push Notifications

**Escenario 3: Service Worker no está registrado**
- Problema: firebase-messaging-sw.js no está activo
- Solución: Refrescar con Ctrl+Shift+R

**Escenario 4: Todo OK pero no llegan notificaciones**
- Problema: Los tokens son de otro dispositivo/navegador
- Solución: Re-registrar tokens en este navegador

---

### Paso 4: Mientras cambias status en bosdetail

En la consola de **rruiz@lima.llc**, deberías ver:

```
[FCM] Foreground message: {notification: {...}, data: {...}}
```

Si NO ves este mensaje, significa que:
- Los mensajes no están llegando desde Firebase
- Los tokens FCM son inválidos
- Hay un problema con el listener

---

### Paso 5: Forzar Re-registro de Token

Si el diagnóstico muestra tokens antiguos, ejecuta esto en **rruiz@lima.llc**:

```javascript
// Ir a Settings → Notifications
// Click en "Enable Push Notifications"
// O ejecutar manualmente:
localStorage.removeItem('fcm_token_registered');
location.reload();
```
