# 📋 Plan de Refactorización: NotificationsPreferencesTab.tsx

## Estado Actual vs. Estado Objetivo

### ❌ ACTUAL (Legacy)
```typescript
// Líneas 74-124: Carga manual de preferencias SMS
useEffect(() => {
  const loadSMSPreferences = async () => {
    const { data: smsPrefs } = await supabase
      .from('user_sms_notification_preferences')
      .select('event_preferences, sms_enabled')
      // Convierte formato antiguo (boolean) a formato UI
  };
}, [user?.id, activeModule]);

// Estado manual
const [eventPreferences, setEventPreferences] = useState<Record<string, Record<NotificationChannel, boolean>>>({});
```

### ✅ OBJETIVO (3-Level Architecture)
```typescript
// Usar hook nuevo que integra validación de 3 niveles
const {
  preferences,
  allowedEvents, // Solo eventos permitidos por Custom Role
  loading,
  saving,
  toggleEventChannel,
  toggleGlobalChannel,
  savePreferences,
  isEventAllowedByRole,
} = useEventBasedNotificationPreferences(dealerId, activeModule);
```

## Cambios Necesarios

### 1. **Obtener dealerId** (CRÍTICO)
```typescript
// ANTES: Se obtenía dentro de useEffect
// DESPUÉS: Obtener dealerId al inicio
const [dealerId, setDealerId] = useState<number | null>(null);

useEffect(() => {
  if (!user?.id) return;

  const fetchDealerId = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('dealership_id')
      .eq('id', user.id)
      .single();

    setDealerId(data?.dealership_id || null);
  };

  fetchDealerId();
}, [user?.id]);
```

### 2. **Integrar Hook Nuevo**
```typescript
// Reemplazar líneas 74-124 con:
const {
  preferences: eventBasedPrefs,
  allowedEvents,
  loading: eventsLoading,
  saving: eventsSaving,
  toggleEventChannel,
  toggleGlobalChannel,
  savePreferences: saveEventPreferences,
  isEventAllowedByRole,
} = useEventBasedNotificationPreferences(dealerId, activeModule);
```

### 3. **Adaptar handleEventToggle** (Línea 134)
```typescript
// ANTES
const handleEventToggle = (eventId: string, channel: NotificationChannel, value: boolean) => {
  setEventPreferences(prev => ({
    ...prev,
    [eventId]: {
      ...(prev[eventId] || {}),
      [channel]: value,
    }
  }));
};

// DESPUÉS
const handleEventToggle = (eventId: string, channel: NotificationChannel, value: boolean) => {
  // Validar que el evento esté permitido por el role
  if (!isEventAllowedByRole(eventId)) {
    toast({
      variant: 'destructive',
      title: t('common.error'),
      description: t('notifications.errors.event_not_allowed_by_role'),
    });
    return;
  }

  toggleEventChannel(eventId, channel, value);
};
```

### 4. **Actualizar handleSave** (Línea 144)
```typescript
// ANTES: Guardar manualmente en user_sms_notification_preferences
// DESPUÉS: Usar método del hook
const handleSave = async () => {
  // 1. Guardar preferencias generales (profiles)
  const sanitizedData = {
    ...formData,
    quiet_hours_start: formData.quiet_hours_start || null,
    quiet_hours_end: formData.quiet_hours_end || null,
  };
  await updatePreferences(sanitizedData);

  // 2. Guardar preferencias event-based (user_sms_notification_preferences)
  await saveEventPreferences();
};
```

### 5. **Filtrar Eventos Mostrados** (Línea 176)
```typescript
// ANTES: Mostrar todos los eventos del módulo
const filteredEvents = getEventsForModule(activeModule).filter(
  event => categoryFilter === 'all' || event.category === categoryFilter
);

// DESPUÉS: Mostrar SOLO eventos permitidos por Custom Role (Level 2)
const filteredEvents = getEventsForModule(activeModule)
  .filter(event => isEventAllowedByRole(event.id)) // ✅ LEVEL 2 VALIDATION
  .filter(event => categoryFilter === 'all' || event.category === categoryFilter);
```

### 6. **Agregar Alert de 3-Level Architecture**
```typescript
// Después de línea 229 (después del alert de SMS)
<Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
  <Info className="h-4 w-4 text-blue-600" />
  <AlertTitle className="text-blue-900 dark:text-blue-100">
    Level 3: Your Personal Preferences
  </AlertTitle>
  <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
    You can only enable notifications for events allowed by your Custom Role.
    You must also be a follower of orders to receive notifications.
  </AlertDescription>
</Alert>
```

### 7. **Actualizar eventPreferences State**
```typescript
// ANTES: Estado local manual
const [eventPreferences, setEventPreferences] = useState<...>({});

// DESPUÉS: Derivar del hook
const eventPreferences = useMemo(() => {
  if (!eventBasedPrefs) return {};

  const prefs: Record<string, Record<NotificationChannel, boolean>> = {};
  Object.entries(eventBasedPrefs.event_preferences).forEach(([eventId, channels]) => {
    prefs[eventId] = channels;
  });

  return prefs;
}, [eventBasedPrefs]);
```

## Orden de Implementación

1. ✅ Agregar imports necesarios
2. ⏳ Obtener dealerId al inicio del componente
3. ⏳ Integrar `useEventBasedNotificationPreferences` hook
4. ⏳ Derivar `eventPreferences` del hook (eliminar useState)
5. ⏳ Actualizar `handleEventToggle` con validación
6. ⏳ Actualizar `handleSave` para usar método del hook
7. ⏳ Filtrar eventos por `isEventAllowedByRole`
8. ⏳ Agregar Alert de Level 3
9. ⏳ Eliminar useEffect antiguo (líneas 74-124)
10. ⏳ Testing manual

## Archivos de Referencia

- Hook nuevo: `src/hooks/useEventBasedNotificationPreferences.ts`
- Edge Function: `supabase/functions/send-order-sms-notification/index.ts`
- Modal Admin: `src/components/dealer/RoleNotificationsModal.tsx`

## Testing Manual Requerido

1. Login como usuario con Custom Role configurado
2. Ir a /profile → Notifications tab
3. Verificar que SOLO se muestran eventos permitidos por el role
4. Cambiar module tab → verificar eventos cambian según role
5. Habilitar/deshabilitar canales → verificar se guardan
6. Verificar que eventos NO permitidos no aparecen
7. Guardar y recargar página → verificar persistencia

## Riesgos Identificados

- ⚠️ Cambio de formato de datos: `boolean` → `MultiChannelEventPreference`
- ⚠️ Dependencia de dealerId: Necesario al inicio
- ⚠️ Breaking change: Usuarios necesitan re-configurar preferencias
- ⚠️ Performance: Hook hace 2 queries por módulo (role + user prefs)

## Mitigación de Riesgos

- ✅ Backup creado: `NotificationsPreferencesTab_OLD.tsx`
- ✅ Migración SQL ya migró datos antiguos a nuevo formato
- ✅ Hook tiene manejo de errores robusto
- ✅ Validación en 3 niveles previene inconsistencias
