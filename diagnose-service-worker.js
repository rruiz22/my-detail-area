/**
 * Script de diagnóstico para Service Worker y Push Notifications
 * Ejecutar en la consola del navegador (ventana rruiz)
 *
 * Este script verifica:
 * 1. Estado del Service Worker
 * 2. Permisos de notificación
 * 3. Registro FCM
 * 4. Suscripción Push
 */

(async function diagnoseServiceWorker() {
  console.log('🔍 ========================================');
  console.log('🔍 DIAGNÓSTICO SERVICE WORKER & PUSH NOTIFICATIONS');
  console.log('🔍 ========================================\n');

  // 1. Verificar soporte del navegador
  console.log('1️⃣ VERIFICANDO SOPORTE DEL NAVEGADOR...');
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasNotifications = 'Notification' in window;
  const hasPushManager = 'PushManager' in window;

  console.log('   ✓ Service Worker:', hasServiceWorker ? '✅ Soportado' : '❌ No soportado');
  console.log('   ✓ Notifications:', hasNotifications ? '✅ Soportado' : '❌ No soportado');
  console.log('   ✓ Push Manager:', hasPushManager ? '✅ Soportado' : '❌ No soportado');

  if (!hasServiceWorker || !hasNotifications || !hasPushManager) {
    console.error('❌ Tu navegador NO soporta Push Notifications');
    return;
  }

  // 2. Verificar permisos de notificación
  console.log('\n2️⃣ VERIFICANDO PERMISOS DE NOTIFICACIÓN...');
  const permission = Notification.permission;
  console.log('   ✓ Permission status:', permission);

  if (permission === 'granted') {
    console.log('   ✅ Permisos otorgados correctamente');
  } else if (permission === 'denied') {
    console.error('   ❌ Permisos DENEGADOS - Debes otorgar permisos en configuración del navegador');
    console.log('   💡 Chrome: Configuración > Privacidad y seguridad > Configuración de sitios > Notificaciones');
    return;
  } else {
    console.warn('   ⚠️ Permisos NO solicitados - Debes hacer clic en "Permitir"');
    return;
  }

  // 3. Listar todos los service workers registrados
  console.log('\n3️⃣ LISTANDO SERVICE WORKERS REGISTRADOS...');
  const registrations = await navigator.serviceWorker.getRegistrations();
  console.log(`   ✓ Total registrados: ${registrations.length}`);

  if (registrations.length === 0) {
    console.error('   ❌ NO hay service workers registrados');
    console.log('   💡 El service worker debería registrarse automáticamente al cargar la app');
    return;
  }

  registrations.forEach((reg, index) => {
    console.log(`\n   📦 Service Worker #${index + 1}:`);
    console.log('      - Scope:', reg.scope);
    console.log('      - Active:', reg.active ? '✅ Activo' : '❌ Inactivo');
    console.log('      - Installing:', reg.installing ? '⏳ Instalando...' : '✅ No');
    console.log('      - Waiting:', reg.waiting ? '⏳ Esperando...' : '✅ No');

    if (reg.active) {
      console.log('      - Script URL:', reg.active.scriptURL);
      console.log('      - State:', reg.active.state);
    }
  });

  // 4. Verificar service worker de Firebase
  console.log('\n4️⃣ VERIFICANDO SERVICE WORKER DE FIREBASE...');
  const firebaseSW = registrations.find(reg =>
    reg.active?.scriptURL?.includes('firebase-messaging-sw.js')
  );

  if (!firebaseSW) {
    console.error('   ❌ Service worker de Firebase NO encontrado');
    console.log('   💡 Debería estar en: /firebase-messaging-sw.js');
    console.log('   💡 Intenta recargar la página (Ctrl+Shift+R - hard refresh)');
    return;
  }

  console.log('   ✅ Service worker de Firebase encontrado');
  console.log('   ✓ Script:', firebaseSW.active.scriptURL);
  console.log('   ✓ State:', firebaseSW.active.state);
  console.log('   ✓ Scope:', firebaseSW.scope);

  // 5. Verificar suscripción push
  console.log('\n5️⃣ VERIFICANDO SUSCRIPCIÓN PUSH...');
  try {
    const subscription = await firebaseSW.pushManager.getSubscription();

    if (!subscription) {
      console.warn('   ⚠️ NO hay suscripción push activa');
      console.log('   💡 El token FCM debería crear una suscripción automáticamente');
    } else {
      console.log('   ✅ Suscripción push activa');
      console.log('   ✓ Endpoint:', subscription.endpoint.substring(0, 80) + '...');

      // Verificar si la suscripción tiene claves (VAPID)
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      console.log('   ✓ P256DH key:', p256dh ? '✅ Presente' : '❌ Ausente');
      console.log('   ✓ Auth key:', auth ? '✅ Presente' : '❌ Ausente');
    }
  } catch (error) {
    console.error('   ❌ Error verificando suscripción:', error);
  }

  // 6. Verificar token FCM en localStorage
  console.log('\n6️⃣ VERIFICANDO TOKEN FCM...');
  const authToken = localStorage.getItem('sb-swfnnrpzpkdypbrzmgnr-auth-token');

  if (!authToken) {
    console.error('   ❌ No estás autenticado');
    return;
  }

  const user = JSON.parse(authToken).user;
  console.log('   ✓ Usuario:', user.email);
  console.log('   ✓ User ID:', user.id);

  // 7. Test de notificación local
  console.log('\n7️⃣ ENVIANDO NOTIFICACIÓN DE PRUEBA...');
  console.log('   💡 Esta notificación debería aparecer incluso con la ventana abierta');

  try {
    const testNotification = await firebaseSW.showNotification('🧪 Test Notification', {
      body: 'Si ves esto, las notificaciones funcionan correctamente',
      icon: '/favicon-mda.svg',
      badge: '/favicon-mda.svg',
      tag: 'test-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: {
        url: '/',
        timestamp: Date.now()
      },
      actions: [
        { action: 'view', title: 'Ver' },
        { action: 'dismiss', title: 'Cerrar' }
      ]
    });

    console.log('   ✅ Notificación de prueba enviada');
    console.log('   💡 ¿Apareció la notificación? Si no, revisa la configuración del sistema operativo');
  } catch (error) {
    console.error('   ❌ Error enviando notificación de prueba:', error);
  }

  // 8. Verificar logs del service worker
  console.log('\n8️⃣ VERIFICANDO LOGS DEL SERVICE WORKER...');
  console.log('   💡 Para ver los logs del service worker:');
  console.log('   1. Abre DevTools (F12)');
  console.log('   2. Ve a Application > Service Workers');
  console.log('   3. Haz clic en "firebase-messaging-sw.js"');
  console.log('   4. Los logs aparecerán en la consola');

  // RESUMEN FINAL
  console.log('\n🔍 ========================================');
  console.log('📊 RESUMEN DEL DIAGNÓSTICO');
  console.log('🔍 ========================================');
  console.log('✅ Soporte del navegador:', hasServiceWorker && hasNotifications && hasPushManager ? 'OK' : 'FALLO');
  console.log('✅ Permisos de notificación:', permission === 'granted' ? 'OK' : 'FALLO');
  console.log('✅ Service Worker registrado:', registrations.length > 0 ? 'OK' : 'FALLO');
  console.log('✅ Service Worker de Firebase:', firebaseSW ? 'OK' : 'FALLO');
  console.log('\n💡 Próximos pasos:');
  console.log('1. Si viste la notificación de prueba, el sistema funciona');
  console.log('2. Si NO la viste, revisa la configuración del sistema operativo');
  console.log('3. Windows: Configuración > Sistema > Notificaciones y acciones');
  console.log('4. Asegúrate de que las notificaciones de Chrome estén habilitadas');
  console.log('🔍 ========================================\n');
})();
