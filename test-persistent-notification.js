/**
 * Test de notificación PERSISTENTE
 * Esta notificación NO desaparece hasta que hagas clic en ella
 */

(async function testPersistentNotification() {
  console.log('🧪 ========================================');
  console.log('🧪 TEST DE NOTIFICACIÓN PERSISTENTE');
  console.log('🧪 ========================================\n');

  // 1. Verificar Focus Assist (Asistencia de concentración)
  console.log('1️⃣ VERIFICANDO FOCUS ASSIST...');
  console.log('   ⚠️ Si Focus Assist está activado, Windows bloquea las notificaciones');
  console.log('   💡 Verifica en: Configuración > Sistema > Asistencia de concentración');
  console.log('   💡 Debe estar en: "Desactivado" (NO "Solo prioritarias" ni "Solo alarmas")\n');

  // 2. Verificar estado de notificaciones
  const permission = Notification.permission;
  if (permission !== 'granted') {
    console.error('❌ Permisos no otorgados:', permission);
    return;
  }

  // 3. Obtener service worker
  const registrations = await navigator.serviceWorker.getRegistrations();
  const firebaseSW = registrations.find(reg =>
    reg.active?.scriptURL?.includes('firebase-messaging-sw.js')
  );

  if (!firebaseSW) {
    console.error('❌ Service worker no encontrado');
    return;
  }

  console.log('2️⃣ ENVIANDO NOTIFICACIÓN PERSISTENTE...');
  console.log('   💡 Esta notificación NO desaparecerá hasta que la cierres manualmente');
  console.log('   💡 Debería aparecer en la ESQUINA INFERIOR DERECHA de tu pantalla\n');

  try {
    // Enviar notificación PERSISTENTE (requireInteraction: true)
    await firebaseSW.showNotification('🔔 NOTIFICACIÓN DE PRUEBA', {
      body: 'Si ves esto, las notificaciones funcionan.\n\nEsta notificación NO desaparecerá hasta que hagas clic en "Cerrar".',
      icon: '/favicon-mda.svg',
      badge: '/favicon-mda.svg',
      tag: 'persistent-test',
      requireInteraction: true, // ← CRÍTICO: La notificación permanece hasta que el usuario la cierre
      vibrate: [300, 200, 300],
      silent: false,
      data: {
        url: '/',
        timestamp: Date.now()
      },
      actions: [
        { action: 'view', title: 'Abrir App' },
        { action: 'dismiss', title: 'Cerrar' }
      ]
    });

    console.log('   ✅ Notificación persistente enviada');
    console.log('\n📍 DÓNDE BUSCAR LA NOTIFICACIÓN:');
    console.log('   1. Esquina INFERIOR DERECHA de la pantalla (Windows 11)');
    console.log('   2. O presiona Win + N para abrir el Centro de notificaciones');
    console.log('   3. Si NO aparece, Focus Assist está bloqueando las notificaciones\n');

    console.log('⏰ Esperando 3 segundos...\n');

    // Enviar OTRA notificación después de 3 segundos
    setTimeout(async () => {
      console.log('3️⃣ ENVIANDO SEGUNDA NOTIFICACIÓN...\n');

      await firebaseSW.showNotification('🚨 SEGUNDA NOTIFICACIÓN', {
        body: 'Esta es la segunda notificación de prueba.\n\nSi ves ambas, el sistema funciona perfectamente.',
        icon: '/favicon-mda.svg',
        badge: '/favicon-mda.svg',
        tag: 'persistent-test-2',
        requireInteraction: true,
        vibrate: [300, 200, 300],
        data: { url: '/' },
        actions: [
          { action: 'view', title: 'Ver' },
          { action: 'dismiss', title: 'Cerrar' }
        ]
      });

      console.log('   ✅ Segunda notificación enviada');
      console.log('\n🔍 ========================================');
      console.log('📊 RESUMEN');
      console.log('🔍 ========================================');
      console.log('✅ Se enviaron 2 notificaciones persistentes');
      console.log('✅ Deberías ver ambas en la esquina inferior derecha');
      console.log('\n❓ SI NO LAS VES:');
      console.log('   1. Presiona Win + N para abrir el Centro de notificaciones');
      console.log('   2. Verifica Focus Assist: Configuración > Sistema > Asistencia de concentración');
      console.log('   3. Asegúrate de que esté en "Desactivado"');
      console.log('🔍 ========================================\n');
    }, 3000);

  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
  }
})();
