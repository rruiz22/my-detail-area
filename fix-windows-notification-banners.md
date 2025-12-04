# 🔧 Solución: Habilitar Banners de Notificación en Windows

**Problema**: Las notificaciones llegan al Centro de notificaciones pero NO aparecen como banners emergentes (popup).

**Causa**: Configuración de Windows bloqueando banners, incluso cuando "Show notification banners" está activado.

---

## ✅ Solución Paso a Paso

### **1. Verificar Asistencia de Concentración (Focus Assist)**

**ESTO ES LO MÁS COMÚN**. Focus Assist tiene reglas automáticas que se activan sin que te des cuenta:

#### Paso 1.1: Desactivar Focus Assist completamente
1. **Win + A** (Abrir Centro de acciones)
2. Busca el botón **"Asistencia de concentración"** o **"Focus Assist"**
3. Haz clic hasta que diga **"Desactivado"** (no "Prioritarias" ni "Solo alarmas")

#### Paso 1.2: Desactivar reglas automáticas
1. **Win + I** → **Sistema** → **Asistencia de concentración**
2. Revisa las **reglas automáticas**:
   - ❌ **"When I'm duplicating my display"** → DESACTIVAR
   - ❌ **"When I'm playing a game"** → DESACTIVAR
   - ❌ **"During these times"** → DESACTIVAR (o configurar horario que no aplique)

**¿Por qué falla?** Windows activa Focus Assist automáticamente cuando:
- Duplicas pantalla (proyector, monitor externo)
- Estás en pantalla completa
- Usas modo gaming
- Estás en horario programado

---

### **2. Verificar Prioridad de Notificaciones**

Windows tiene prioridades que afectan si los banners aparecen:

1. **Win + I** → **Sistema** → **Notificaciones**
2. Busca **"localhost (via Microsoft Edge)"**
3. Haz clic en la **flecha (>)** para expandir
4. Verifica:
   - ✅ **Notifications: On**
   - ✅ **Show notification banners** ← CRÍTICO
   - ✅ **Show notifications in notification center**
   - ✅ **Play a sound when a notification arrives**
5. **Priority**: Cambia a **"High"** (en lugar de "Normal")
   - Esto fuerza a Windows a mostrar el banner

---

### **3. Desactivar "Quiet Hours" / "Do Not Disturb"**

Windows 11 tiene un modo "No molestar" adicional:

1. **Win + A** (Centro de acciones)
2. Busca el ícono de **luna 🌙** o **"Do Not Disturb"**
3. Si está activado → Desactivar

---

### **4. Verificar Battery Saver (Ahorro de batería)**

Si estás en laptop, el modo ahorro de batería bloquea notificaciones:

1. **Win + A** → Busca **"Battery saver"**
2. Desactivar si está activo

---

### **5. Reiniciar Windows Notification Service**

A veces el servicio de notificaciones se "atasca":

1. **Win + R** → escribe: `services.msc` → Enter
2. Busca: **"Windows Push Notifications System Service"**
3. Click derecho → **Reiniciar**

O desde PowerShell (Administrador):
```powershell
Restart-Service -Name WpnService -Force
```

---

### **6. Test de Notificación Nativa de Windows**

Vamos a probar si Windows puede mostrar banners EN GENERAL:

#### PowerShell test:
```powershell
# Abrir PowerShell (Win + X → Windows PowerShell)
# Copiar y pegar esto:

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$APP_ID = 'Microsoft.Explorer.Notification.{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'

$template = @"
<toast>
    <visual>
        <binding template="ToastText02">
            <text id="1">🧪 Test de Notificación</text>
            <text id="2">Si ves esto como POPUP, Windows puede mostrar banners</text>
        </binding>
    </visual>
</toast>
"@

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = New-Object Windows.UI.Notifications.ToastNotification $xml
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($APP_ID).Show($toast)

Write-Host "✅ Notificación enviada - debería aparecer como banner emergente" -ForegroundColor Green
```

**Si este test NO muestra banner** → El problema es de Windows (no del navegador)
**Si este test SÍ muestra banner** → El problema es específico de Microsoft Edge/localhost

---

### **7. Configuración Específica de Microsoft Edge**

Si el test de PowerShell funcionó pero Edge no:

#### Opción A: Cambiar configuración de Edge
1. Abre **Microsoft Edge**
2. **Configuración** (edge://settings/)
3. **Cookies y permisos de sitio** → **Notificaciones**
4. Busca **"localhost:8080"**
5. Asegúrate de que esté en **"Permitir"** (no "Preguntar")

#### Opción B: Registrar como PWA
Edge puede bloquear banners de sitios "normales" pero permitirlos en PWA:

1. En Edge, abre **localhost:8080**
2. Menú (…) → **Aplicaciones** → **Instalar este sitio como aplicación**
3. Acepta el nombre "MyDetailArea"
4. Ahora abre la app PWA (en lugar del navegador normal)
5. Las notificaciones desde PWA tienen más prioridad

---

### **8. Verificar que no estás en "Modo presentación"**

Windows bloquea banners durante presentaciones:

1. **Win + P** → Verifica que esté en **"Solo pantalla de PC"**
2. Si está en "Duplicar", "Extender" o "Segunda pantalla únicamente":
   - Puede activar Focus Assist automáticamente
   - Cambia a "Solo pantalla de PC" para testing

---

## 🧪 Test Final (Después de los Pasos)

Ejecuta esto en la consola de Edge (ventana rruiz) después de hacer los pasos:

```javascript
(async function testFinalBanner() {
  console.log('🎉 TEST FINAL DE BANNERS\n');

  const reg = (await navigator.serviceWorker.getRegistrations())[0];

  // Enviar 3 notificaciones con delay
  for (let i = 1; i <= 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    await reg.showNotification(`🔔 Banner #${i} de 3`, {
      body: `Esta es la notificación ${i}. Debería aparecer como POPUP.`,
      icon: '/favicon-mda.svg',
      badge: '/favicon-mda.svg',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      tag: `test-${i}`,
      actions: [
        { action: 'ok', title: 'OK' },
        { action: 'dismiss', title: 'Cerrar' }
      ]
    });

    console.log(`✅ Banner #${i} enviado`);
  }

  console.log('\n✅ Test completado');
  console.log('💡 Deberías haber visto 3 popups emergentes en la esquina');
  console.log('📍 Si NO los viste, el problema es Focus Assist o configuración de Windows');
})();
```

---

## 📊 Diagnóstico de Problemas

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| Notificaciones solo en Centro | Focus Assist activado | Paso 1 |
| Banners aparecen a veces | Reglas automáticas de Focus Assist | Paso 1.2 |
| Test PowerShell no funciona | Servicio de notificaciones atascado | Paso 5 |
| Test PowerShell funciona, Edge no | Configuración de Edge | Paso 7 |
| Laptop sin banners | Battery Saver activado | Paso 4 |
| Con monitor externo no funciona | Modo duplicar activa Focus Assist | Paso 8 |

---

## ✅ Checklist de Verificación

Marca lo que has verificado:

- [ ] Focus Assist está **Desactivado** (Win + A)
- [ ] Reglas automáticas de Focus Assist **desactivadas**
- [ ] Prioridad de localhost cambiada a **"High"**
- [ ] "Do Not Disturb" **desactivado**
- [ ] Battery Saver **desactivado** (laptops)
- [ ] Servicio de notificaciones **reiniciado**
- [ ] Test de PowerShell **ejecutado y funcionó**
- [ ] Configuración de Edge para localhost **en "Permitir"**
- [ ] **NO** estás en modo "Duplicar pantalla" (Win + P)

---

## 🎯 Solución Alternativa (Mientras tanto)

Si después de todo esto NO aparecen banners, el sistema **igual funciona**:

- ✅ Notificaciones llegan al Centro de notificaciones (Win + N)
- ✅ Foreground: Toast de shadcn/ui aparece cuando la app está abierta
- ✅ Background: Centro de notificaciones acumula todas las notificaciones
- ✅ Click en notificación del Centro → Navega a la orden correctamente

**Es funcional**, solo que el usuario debe abrir el Centro manualmente en lugar de ver popups automáticos.

---

## 🔍 Debugging Avanzado

Si nada de lo anterior funciona, verifica el Registro de Windows:

```powershell
# PowerShell como Administrador
Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications" -Name "ToastEnabled"
```

**Resultado esperado**: `ToastEnabled : 1`

Si es `0`, ejecuta:
```powershell
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications" -Name "ToastEnabled" -Value 1
```

Luego **reinicia Windows**.

---

**Autor**: Claude Code
**Última actualización**: 2025-12-03
