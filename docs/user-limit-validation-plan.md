# Plan de Implementación: Validación de Límite de Usuarios por Plan

**Fecha de Análisis:** 2024-12-09
**Estado:** PENDIENTE DE IMPLEMENTACIÓN
**Prioridad:** MEDIA-ALTA (Feature de negocio crítico no funcional)

---

## 🔴 Problema Identificado

El sistema tiene un campo `max_users` en la tabla `dealerships` y muestra los planes de suscripción en el UI, pero **NO EXISTE NINGUNA VALIDACIÓN FUNCIONAL** que impida crear usuarios más allá del límite permitido.

### Estado Actual del Sistema

- ✅ Campo `max_users` existe en base de datos
- ✅ Enum `subscription_plan` definido (basic/premium/enterprise)
- ✅ UI muestra límites y permite editarlos
- ❌ **NINGUNA VALIDACIÓN** en ninguna capa (DB, Backend, Frontend)
- ❌ Trigger existente valida tabla LEGACY `detail_users` (ya no se usa)

---

## 📊 Análisis Exhaustivo

### 1. Base de Datos

**Tabla `dealerships`:**
```sql
CREATE TABLE public.dealerships (
    ...
    subscription_plan subscription_plan DEFAULT 'basic',
    max_users INTEGER DEFAULT 5,
    ...
);
```

**Planes y Límites:**
```typescript
// src/components/dealerships/DealershipModal.tsx:213-217
const maxUsersByPlan = {
  basic: 5,      // 5 usuarios
  premium: 25,   // 25 usuarios
  enterprise: 100 // 100 usuarios
};
```

**Trigger Obsoleto:**
- Archivo: `supabase/migrations/20250906201046_60a24715-9acb-421f-80c9-88ea9ab0590c.sql`
- Función: `validate_user_limit()` (líneas 151-176)
- **Problema:** Solo valida en tabla `detail_users` (LEGACY - ya no se usa)
- **Sistema actual:** Usa `profiles` + `dealer_memberships`

### 2. Backend (Edge Function)

**Archivo:** `supabase/functions/create-dealer-user/index.ts`

**Validaciones Actuales:**
- ✅ Línea 268-287: Valida que dealership existe
- ✅ Línea 294-296: Valida dealership_id requerido
- ❌ **NO valida** conteo de usuarios vs `max_users`
- ❌ **NO verifica** límite antes de crear membership

**Flujo Actual:**
1. Valida dealership existe
2. Crea Auth user (línea 312)
3. Crea profile (línea 338)
4. Crea dealer_membership (línea 412-415) ← **SIN VALIDACIÓN DE LÍMITE**

### 3. Frontend

**DirectUserCreationModal.tsx:**
- Ubicación: `src/components/users/DirectUserCreationModal.tsx`
- ❌ No consulta `max_users` del dealership
- ❌ No muestra indicador de límite (ej: "4/5 usuarios")
- ❌ No valida antes de submit
- ❌ No deshabilita botón si límite alcanzado

**DealerInvitationModal.tsx:**
- Ubicación: `src/components/dealerships/DealerInvitationModal.tsx`
- Línea 156-161: Llama RPC `create_dealer_invitation`
- ❌ No valida límite antes de invitar
- ❌ No muestra badge con límite disponible

**DealershipModal.tsx:**
- Ubicación: `src/components/dealerships/DealershipModal.tsx`
- Línea 333-341: Input para editar `max_users`
- Línea 219-225: Cambia `max_users` al cambiar plan
- ❌ **NO valida** si usuarios actuales exceden nuevo límite en downgrade

### 4. RPC Function

**Función:** `create_dealer_invitation`
- Archivo: `supabase/migrations/20251002135038_create_dealer_invitation_functions.sql`
- Líneas 20-112: Definición de función
- ✅ Valida dealer existe (líneas 45-48)
- ✅ Valida role name (líneas 50-61)
- ❌ **NO valida** límite de usuarios

---

## 🎯 Plan de Implementación Completo

### FASE 1: Validación de Base de Datos (CRÍTICO)

**Objetivo:** Enforcement a nivel de base de datos como última línea de defensa.

**Archivo a crear:** `supabase/migrations/YYYYMMDDHHMMSS_fix_user_limit_validation.sql`

**Contenido:**
```sql
-- Crear función de validación
CREATE OR REPLACE FUNCTION public.validate_dealer_membership_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_active_users INTEGER;
    max_allowed_users INTEGER;
    dealership_name TEXT;
BEGIN
    -- Obtener límite del dealership
    SELECT max_users, name INTO max_allowed_users, dealership_name
    FROM public.dealerships
    WHERE id = NEW.dealer_id;

    IF max_allowed_users IS NULL THEN
        RETURN NEW; -- Dejar que FK constraint lo maneje
    END IF;

    -- Contar memberships activos actuales
    SELECT COUNT(*) INTO current_active_users
    FROM public.dealer_memberships
    WHERE dealer_id = NEW.dealer_id
    AND is_active = TRUE;

    -- Validar límite en INSERT o cuando se activa usuario
    IF (TG_OP = 'INSERT' AND NEW.is_active = TRUE) OR
       (TG_OP = 'UPDATE' AND OLD.is_active = FALSE AND NEW.is_active = TRUE) THEN

        IF current_active_users >= max_allowed_users THEN
            RAISE EXCEPTION 'User limit exceeded for dealership "%" (% users). Maximum % users allowed.',
                dealership_name, current_active_users, max_allowed_users
                USING HINT = 'Upgrade subscription plan or deactivate existing users.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en dealer_memberships (tabla actual)
DROP TRIGGER IF EXISTS validate_dealer_membership_limit_trigger ON public.dealer_memberships;

CREATE TRIGGER validate_dealer_membership_limit_trigger
    BEFORE INSERT OR UPDATE OF is_active ON public.dealer_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_dealer_membership_limit();
```

**Aplicar migración:**
```bash
supabase db push
# O usando MCP:
# mcp__supabase__apply_migration(name: "fix_user_limit_validation", query: "...")
```

---

### FASE 2: Validación en Edge Function

**Objetivo:** Validación temprana con mensajes claros antes de crear usuario.

**Archivo:** `supabase/functions/create-dealer-user/index.ts`

**Ubicación:** Después de línea 289 (después de validar dealership)

**Código a agregar:**
```typescript
// Validar límite de usuarios
console.log('=== VALIDATING USER LIMIT ===')

// Obtener max_users y plan del dealership (ya traído en línea 270)
const { data: dealership, error: dealershipError } = await supabase
  .from('dealerships')
  .select('id, name, max_users, subscription_plan') // Agregar estos campos
  .eq('id', dealershipId)
  .single()

// Contar usuarios activos actuales
const { count: currentUserCount, error: countError } = await supabase
  .from('dealer_memberships')
  .select('*', { count: 'exact', head: true })
  .eq('dealer_id', dealershipId)
  .eq('is_active', true)

if (countError) {
  console.error('Error counting users:', countError)
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Failed to validate user limit',
      details: countError
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
  )
}

const activeUsers = currentUserCount || 0
const maxUsers = dealership.max_users || 5

console.log(`Current active users: ${activeUsers}/${maxUsers}`)

if (activeUsers >= maxUsers) {
  console.error(`User limit exceeded: ${activeUsers}/${maxUsers}`)
  return new Response(
    JSON.stringify({
      success: false,
      error: `User limit exceeded for "${dealership.name}". Currently has ${activeUsers} active users. Maximum ${maxUsers} users allowed for ${dealership.subscription_plan} plan.`,
      error_code: 'USER_LIMIT_EXCEEDED',
      current_users: activeUsers,
      max_users: maxUsers,
      subscription_plan: dealership.subscription_plan
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
  )
}

console.log('✅ User limit validated: within limits')
```

**Deployment:**
```bash
supabase functions deploy create-dealer-user
# O usando MCP:
# mcp__supabase__deploy_edge_function(name: "create-dealer-user", ...)
```

---

### FASE 3: Validación Frontend - DirectUserCreationModal

**Objetivo:** Mostrar límite disponible y prevenir submit si excedido.

**Archivo:** `src/components/users/DirectUserCreationModal.tsx`

#### 3.1. Agregar estado para límites

**Ubicación:** Después de línea 50

```typescript
const [userLimitInfo, setUserLimitInfo] = useState<{
  currentUsers: number;
  maxUsers: number;
  isLoading: boolean;
  isLimitReached: boolean;
} | null>(null);
```

#### 3.2. Crear función para obtener límite

**Ubicación:** Después de línea 100 (dentro del componente)

```typescript
const fetchUserLimit = useCallback(async (dealershipId: string) => {
  if (!dealershipId) {
    setUserLimitInfo(null);
    return;
  }

  setUserLimitInfo(prev => ({ ...prev, isLoading: true }) as any);

  try {
    // Obtener max_users del dealership
    const { data: dealership, error: dealerError } = await supabase
      .from('dealerships')
      .select('max_users, subscription_plan')
      .eq('id', parseInt(dealershipId))
      .single();

    if (dealerError) throw dealerError;

    // Contar usuarios activos
    const { count, error: countError } = await supabase
      .from('dealer_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', parseInt(dealershipId))
      .eq('is_active', true);

    if (countError) throw countError;

    const currentUsers = count || 0;
    const maxUsers = dealership?.max_users || 5;

    setUserLimitInfo({
      currentUsers,
      maxUsers,
      isLoading: false,
      isLimitReached: currentUsers >= maxUsers
    });
  } catch (error) {
    console.error('Error fetching user limit:', error);
    setUserLimitInfo(null);
  }
}, []);
```

#### 3.3. Llamar función cuando cambia dealership

**Ubicación:** Agregar useEffect después de línea 72

```typescript
useEffect(() => {
  if (formData.dealershipId) {
    fetchUserLimit(formData.dealershipId);
  }
}, [formData.dealershipId, fetchUserLimit]);
```

#### 3.4. Agregar indicador visual en UI

**Ubicación:** Antes del botón de submit (alrededor de línea 350)

```typescript
{/* User Limit Indicator */}
{userLimitInfo && formData.dealershipId && (
  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {t('users.user_limit')}:
      </span>
    </div>
    <Badge
      variant={
        userLimitInfo.isLimitReached ? 'destructive' :
        userLimitInfo.currentUsers / userLimitInfo.maxUsers > 0.8 ? 'warning' :
        'success'
      }
    >
      {userLimitInfo.currentUsers}/{userLimitInfo.maxUsers} {t('users.users')}
    </Badge>
  </div>
)}

{userLimitInfo?.isLimitReached && (
  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
    <AlertTriangle className="h-4 w-4 text-destructive" />
    <p className="text-sm text-destructive">
      {t('users.user_limit_reached_message')}
    </p>
  </div>
)}
```

#### 3.5. Deshabilitar botón si límite alcanzado

**Ubicación:** Modificar botón de submit (línea ~360)

```typescript
<Button
  onClick={handleSubmit}
  disabled={
    isSubmitting ||
    currentStep < 2 ||
    userLimitInfo?.isLimitReached
  }
>
  {isSubmitting ? t('common.creating') : t('users.create_user')}
</Button>
```

#### 3.6. Manejar error del backend

**Ubicación:** En función handleSubmit, después de llamar Edge Function

```typescript
const response = await fetch(/* ... */);
const result = await response.json();

if (!result.success) {
  // Manejar error específico de límite
  if (result.error_code === 'USER_LIMIT_EXCEEDED') {
    toast({
      variant: 'destructive',
      title: t('users.user_limit_exceeded'),
      description: t('users.user_limit_exceeded_description', {
        current: result.current_users,
        max: result.max_users,
        plan: result.subscription_plan
      })
    });
    return;
  }
  // ... resto de manejo de errores
}
```

---

### FASE 4: Validación Frontend - DealerInvitationModal

**Objetivo:** Mismo sistema de límites para invitaciones.

**Archivo:** `src/components/dealerships/DealerInvitationModal.tsx`

**Implementación:** Casi idéntica a DirectUserCreationModal, con estos cambios:

1. Agregar mismo estado `userLimitInfo`
2. Agregar misma función `fetchUserLimit`
3. Llamar cuando se selecciona dealership en dropdown (línea ~95)
4. Mostrar badge de límite junto al selector de dealership
5. Deshabilitar botón "Send Invitation" si límite alcanzado
6. Manejar error `USER_LIMIT_EXCEEDED` del RPC

**Nota:** El RPC `create_dealer_invitation` también necesitaría validación, pero si el trigger DB está activo, bloqueará la creación de membership igualmente.

---

### FASE 5: Indicador Visual en Admin Panel

**Objetivo:** Mostrar "X/Y users" en lista de dealerships.

**Archivo:** `src/components/admin/DealershipManagement.tsx`

#### 5.1. Actualizar interface Dealership

**Ubicación:** Línea 51 (agregar campo)

```typescript
interface Dealership {
  // ... campos existentes
  logo_url?: string | null;
  max_users: number; // Asegurar que existe
  active_user_count?: number; // Agregar este campo
  // ... resto de campos
}
```

#### 5.2. Obtener conteo en fetchDealerships

**Ubicación:** Línea 110-130 (modificar query de counts)

```typescript
const dealershipsWithCounts = await Promise.all(
  (data || []).map(async (dealership) => {
    const [contactsResult, usersResult] = await Promise.all([
      supabase
        .from('dealership_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('dealership_id', dealership.id)
        .is('deleted_at', null),
      supabase
        .from('dealer_memberships') // Cambiar de 'profiles'
        .select('id', { count: 'exact', head: true })
        .eq('dealer_id', dealership.id)
        .eq('is_active', true) // Solo activos
    ]);

    return {
      ...dealership,
      contact_count: contactsResult.count || 0,
      user_count: usersResult.count || 0,
      active_user_count: usersResult.count || 0 // Guardar como active_user_count
    };
  })
);
```

#### 5.3. Agregar columna con badge en tabla

**Ubicación:** Línea 518 (modificar celda de usuarios)

```typescript
<TableCell>
  <div className="flex items-center gap-2">
    <span>{dealership.active_user_count || 0}</span>
    <Badge
      variant={
        (dealership.active_user_count || 0) >= dealership.max_users
          ? 'destructive'
          : (dealership.active_user_count || 0) / dealership.max_users > 0.8
            ? 'warning'
            : 'secondary'
      }
      className="text-xs"
    >
      {dealership.active_user_count || 0}/{dealership.max_users}
    </Badge>
  </div>
</TableCell>
```

#### 5.4. Actualizar header de columna

**Ubicación:** Alrededor de línea 470

```typescript
<TableHead className="text-center">
  {t('dealerships.users')} / {t('dealerships.limit')}
</TableHead>
```

---

### FASE 6: Protección de Downgrade

**Objetivo:** Prevenir downgrades que dejen usuarios excediendo límite.

**Archivo:** `src/components/dealerships/DealershipModal.tsx`

#### 6.1. Agregar estado para validación

**Ubicación:** Después de línea 105

```typescript
const [downgradeWarning, setDowngradeWarning] = useState<{
  show: boolean;
  currentUsers: number;
  newLimit: number;
  excessUsers: number;
} | null>(null);
```

#### 6.2. Modificar handlePlanChange

**Ubicación:** Línea 219-225 (reemplazar función completa)

```typescript
const handlePlanChange = async (plan: SubscriptionPlan) => {
  const newMaxUsers = maxUsersByPlan[plan];
  const oldMaxUsers = formData.max_users;

  // Si es downgrade, validar usuarios activos
  if (dealership && newMaxUsers < oldMaxUsers) {
    try {
      const { count } = await supabase
        .from('dealer_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('dealer_id', dealership.id)
        .eq('is_active', true);

      const activeUsers = count || 0;

      if (activeUsers > newMaxUsers) {
        // Mostrar warning
        setDowngradeWarning({
          show: true,
          currentUsers: activeUsers,
          newLimit: newMaxUsers,
          excessUsers: activeUsers - newMaxUsers
        });
        return; // No aplicar cambio todavía
      }
    } catch (error) {
      console.error('Error checking user count:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('dealerships.error_checking_users')
      });
      return;
    }
  }

  // Aplicar cambio de plan
  setFormData(prev => ({
    ...prev,
    subscription_plan: plan,
    max_users: newMaxUsers
  }));
};
```

#### 6.3. Agregar dialog de confirmación de downgrade

**Ubicación:** Antes del cierre del Dialog principal (línea ~650)

```typescript
{/* Downgrade Warning Dialog */}
{downgradeWarning?.show && (
  <Dialog open={downgradeWarning.show} onOpenChange={() => setDowngradeWarning(null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          {t('dealerships.downgrade_warning_title')}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('dealerships.downgrade_warning_message', {
            current: downgradeWarning.currentUsers,
            newLimit: downgradeWarning.newLimit,
            excess: downgradeWarning.excessUsers
          })}
        </p>
        <div className="bg-destructive/10 p-3 rounded-md">
          <p className="text-sm text-destructive">
            {t('dealerships.downgrade_action_required')}
          </p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setDowngradeWarning(null)}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            // Usuario confirma que va a manejar los usuarios excedentes
            setFormData(prev => ({
              ...prev,
              subscription_plan: formData.subscription_plan, // Mantener plan seleccionado
              max_users: downgradeWarning.newLimit
            }));
            setDowngradeWarning(null);
            toast({
              variant: 'warning',
              title: t('dealerships.downgrade_confirmed'),
              description: t('dealerships.deactivate_users_reminder')
            });
          }}
        >
          {t('dealerships.confirm_downgrade')}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)}
```

---

### FASE 7: Traducciones

**Archivos a modificar:**
- `public/translations/en/dealerships.json`
- `public/translations/es/dealerships.json`
- `public/translations/pt-BR/dealerships.json`

**Keys a agregar en sección `dealerships`:**

```json
{
  "dealerships": {
    // ... keys existentes ...

    // User limit general
    "limit": "Limit",
    "users_limit": "Users Limit",

    // Admin panel
    "users_count_with_limit": "{{count}}/{{max}} users",

    // DirectUserCreationModal & DealerInvitationModal
    "user_limit": "User Limit",
    "users": "users",
    "user_limit_reached": "User limit reached",
    "user_limit_reached_message": "This dealership has reached its maximum user limit. Please upgrade the subscription plan or deactivate existing users to add more.",
    "user_limit_exceeded": "User Limit Exceeded",
    "user_limit_exceeded_description": "Cannot create user. Dealership currently has {{current}} active users. Maximum {{max}} users allowed for {{plan}} plan.",
    "error_checking_users": "Failed to check current user count",

    // Downgrade protection
    "downgrade_warning_title": "Plan Downgrade Warning",
    "downgrade_warning_message": "This dealership currently has {{current}} active users, but the new plan limit is {{newLimit}}. You need to deactivate {{excess}} user(s) before downgrading.",
    "downgrade_action_required": "⚠️ You must deactivate excess users before this change takes effect.",
    "downgrade_confirmed": "Plan downgrade scheduled",
    "deactivate_users_reminder": "Remember to deactivate excess users to comply with the new limit.",
    "confirm_downgrade": "Confirm Downgrade"
  }
}
```

**Español (`es`):**
```json
{
  "limit": "Límite",
  "users_limit": "Límite de Usuarios",
  "users_count_with_limit": "{{count}}/{{max}} usuarios",
  "user_limit": "Límite de Usuarios",
  "users": "usuarios",
  "user_limit_reached": "Límite alcanzado",
  "user_limit_reached_message": "Este dealership ha alcanzado su límite máximo de usuarios. Por favor actualice el plan de suscripción o desactive usuarios existentes para agregar más.",
  "user_limit_exceeded": "Límite de Usuarios Excedido",
  "user_limit_exceeded_description": "No se puede crear usuario. El dealership actualmente tiene {{current}} usuarios activos. Máximo {{max}} usuarios permitidos para plan {{plan}}.",
  "error_checking_users": "Error al verificar conteo de usuarios",
  "downgrade_warning_title": "Advertencia de Degradación de Plan",
  "downgrade_warning_message": "Este dealership actualmente tiene {{current}} usuarios activos, pero el nuevo límite del plan es {{newLimit}}. Necesita desactivar {{excess}} usuario(s) antes de degradar.",
  "downgrade_action_required": "⚠️ Debe desactivar usuarios excedentes antes de que este cambio tome efecto.",
  "downgrade_confirmed": "Degradación de plan programada",
  "deactivate_users_reminder": "Recuerde desactivar usuarios excedentes para cumplir con el nuevo límite.",
  "confirm_downgrade": "Confirmar Degradación"
}
```

**Português (`pt-BR`):**
```json
{
  "limit": "Limite",
  "users_limit": "Limite de Usuários",
  "users_count_with_limit": "{{count}}/{{max}} usuários",
  "user_limit": "Limite de Usuários",
  "users": "usuários",
  "user_limit_reached": "Limite alcançado",
  "user_limit_reached_message": "Esta concessionária atingiu seu limite máximo de usuários. Por favor, atualize o plano de assinatura ou desative usuários existentes para adicionar mais.",
  "user_limit_exceeded": "Limite de Usuários Excedido",
  "user_limit_exceeded_description": "Não é possível criar usuário. A concessionária atualmente tem {{current}} usuários ativos. Máximo de {{max}} usuários permitidos para o plano {{plan}}.",
  "error_checking_users": "Falha ao verificar contagem de usuários",
  "downgrade_warning_title": "Aviso de Rebaixamento de Plano",
  "downgrade_warning_message": "Esta concessionária atualmente tem {{current}} usuários ativos, mas o novo limite do plano é {{newLimit}}. Você precisa desativar {{excess}} usuário(s) antes de rebaixar.",
  "downgrade_action_required": "⚠️ Você deve desativar usuários excedentes antes que esta alteração entre em vigor.",
  "downgrade_confirmed": "Rebaixamento de plano agendado",
  "deactivate_users_reminder": "Lembre-se de desativar usuários excedentes para cumprir com o novo limite.",
  "confirm_downgrade": "Confirmar Rebaixamento"
}
```

---

## 🔍 Query de Verificación (Post-Implementación)

Después de implementar, ejecutar esta query para verificar dealerships que excedan límite:

```sql
SELECT
    d.id,
    d.name,
    d.subscription_plan,
    d.max_users,
    COUNT(dm.id) FILTER (WHERE dm.is_active = TRUE) as active_users,
    COUNT(dm.id) FILTER (WHERE dm.is_active = TRUE) - d.max_users as overage
FROM dealerships d
LEFT JOIN dealer_memberships dm ON dm.dealer_id = d.id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name, d.subscription_plan, d.max_users
HAVING COUNT(dm.id) FILTER (WHERE dm.is_active = TRUE) > d.max_users
ORDER BY overage DESC;
```

Si hay dealerships con overage, decidir:
1. Actualizar `max_users` para acomodarlos
2. Desactivar usuarios excedentes
3. Actualizar su plan a uno superior

---

## 📝 Orden de Implementación Recomendado

1. **FASE 7: Traducciones** (10 min) - Agregar keys primero
2. **FASE 1: Migración DB** (15 min) - Enforcement de última línea
3. **FASE 2: Edge Function** (20 min) - Validación backend temprana
4. **FASE 5: Admin Panel** (15 min) - Visibilidad del problema
5. **FASE 3: DirectUserCreationModal** (30 min) - UX en creación directa
6. **FASE 4: DealerInvitationModal** (20 min) - UX en invitaciones
7. **FASE 6: Downgrade Protection** (25 min) - Protección de cambio de plan

**Tiempo total estimado:** ~2.5 horas

---

## ⚠️ Consideraciones Importantes

### 1. Datos Existentes
Antes de aplicar la migración, revisar si hay dealerships que YA exceden sus límites. Si los hay, decidir cómo manejarlos.

### 2. System Admins
Considerar si system_admins deben poder bypassear el límite con un flag especial o audit log.

### 3. Testing
Después de cada fase, probar:
- Crear usuario cuando límite disponible ✅
- Crear usuario cuando límite alcanzado ❌ (debe fallar)
- Downgrade con usuarios excedentes ❌ (debe advertir)
- Upgrade y crear más usuarios ✅

### 4. Migración Suave
Si se decide implementar gradualmente:
1. Empezar con FASE 5 (indicadores) para visibilidad
2. Luego FASE 1 (DB trigger) en modo "warning" (log pero no bloquear)
3. Finalmente activar blocking después de limpiar data

### 5. Alternativa: Soft Limit
En lugar de bloquear completamente, considerar:
- Permitir exceder límite pero mostrar warning prominente
- Enviar notificación a admin cuando se excede
- Bloquear solo después de X% de exceso (ej: 120% del límite)

---

## 📚 Referencias

### Archivos Clave
- **Migración base:** `supabase/migrations/20250906201046_60a24715-9acb-421f-80c9-88ea9ab0590c.sql`
- **Edge Function:** `supabase/functions/create-dealer-user/index.ts`
- **Modal creación:** `src/components/users/DirectUserCreationModal.tsx`
- **Modal invitación:** `src/components/dealerships/DealerInvitationModal.tsx`
- **Admin panel:** `src/components/admin/DealershipManagement.tsx`
- **Dealership modal:** `src/components/dealerships/DealershipModal.tsx`

### Documentación Supabase
- [Database Triggers](https://supabase.com/docs/guides/database/postgres/triggers)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Realtime Subscriptions](https://supabase.com/docs/guides/realtime)

---

**Autor:** Claude Code
**Última actualización:** 2024-12-09
**Versión:** 1.0
