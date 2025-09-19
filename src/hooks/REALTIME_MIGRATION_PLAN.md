# Real-Time Migration Plan - Hook by Hook Analysis

## 🚀 **Status: IN PROGRESS**

**Objetivo**: Reducir de 26 a 3-5 suscripciones críticas

---

## ✅ **COMPLETADO**

### **Core Infrastructure**
- ✅ `src/config/realtimeFeatures.ts` - Feature flags created
- ✅ `src/hooks/useSubscriptionManager.ts` - Subscription limits manager
- ✅ `src/hooks/useSmartPolling.ts` - Intelligent polling replacement
- ✅ `src/hooks/useOrderManagement.ts` - Global subscription → Smart polling
- ✅ `src/components/orders/UnifiedOrderDetailModal.tsx` - Individual subscription → Polling

---

## 🎯 **MANTENER (Real-Time Crítico)**

### **Chat & Collaboration (3-4 hooks)**
- 🟢 `useChatMessages.tsx` - **MANTENER** - Colaboración esencial
- 🟢 `useChatNotifications.tsx` - **MANTENER** - Alertas críticas
- 🟢 `useChatConversations.tsx` - **MANTENER** - Flujo de conversación
- 🟡 `useTypingIndicators.tsx` - **EVALUAR** - Puede ser opcional

### **Critical Business Operations (1-2 hooks)**
- 🟢 **Status changes** - Ya implementado en useOrderManagement con filtro
- 🟢 **Order assignments** - Implementar suscripción específica si necesario

---

## ❌ **ELIMINAR/CONVERTIR (No Crítico)**

### **Order Data Hooks (4 hooks)**
- 🔴 `useRealtimeOrderData.ts` - **ELIMINAR** (493 líneas → Polling)
- 🔴 `useRealtimeSchedule.ts` - **ELIMINAR** → Optimistic updates
- 🔴 `useOrderActivity.tsx` - **ELIMINAR** → Refresh on demand
- 🔴 `useOrderComments.ts` - **CONVERTIR** → Optimistic updates

### **Order Type Managers (3 hooks)**
- 🔴 `useCarWashOrderManagement.ts` - **CONVERTIR** → Smart polling
- 🔴 `useServiceOrderManagement.ts` - **CONVERTIR** → Smart polling
- 🔴 `useReconOrderManagement.ts` - **CONVERTIR** → Smart polling (2 channels)

### **User & Social Features (4 hooks)**
- 🔴 `useFollowers.ts` - **ELIMINAR** → Eventual consistency
- 🔴 `useEntityFollowers.tsx` - **ELIMINAR** → Eventual consistency
- 🔴 `useUserPresence.tsx` - **ELIMINAR** → No crítico para concesionarios
- 🔴 `useUserNotifications.tsx` - **CONVERTIR** → Polling cada 3 minutos

### **System & Monitoring (4 hooks)**
- 🔴 `SystemStatsCard.tsx` (3 channels) - **CONVERTIR** → Polling cada 2 minutos
- 🔴 `RecentActivityFeed.tsx` - **CONVERTIR** → Polling cada 5 minutos
- 🔴 `LiveActivityFeed.tsx` - **CONVERTIR** → Polling o eliminar
- 🔴 `useEnhancedNotifications.tsx` - **CONVERTIR** → Polling

### **Other Components (2 hooks)**
- 🔴 `AttachmentsList.tsx` - **CONVERTIR** → Optimistic updates
- 🔴 `useCommunications.tsx` - **EVALUAR** → Puede ir con chat

---

## 🔧 **IMPLEMENTACIÓN PENDIENTE**

### **Próximos Pasos**

1. **Eliminar useRealtimeOrderData.ts**
   - Hook más complejo (493 líneas)
   - Mayor impacto en performance
   - Reemplazar con polling específico

2. **Convertir Order Management Hooks**
   - Car wash, service, recon order managers
   - Usar smart polling en lugar de suscripciones

3. **Implementar Optimistic Updates**
   - Comments y notes
   - Attachments
   - Followers

4. **Simplificar System Stats**
   - De real-time a polling cada 2 minutos
   - Reducir de 3 a 1 consulta

---

## 📊 **PROGRESO**

- **Completado**: 5/26 archivos migrados (19%)
- **En progreso**: Core infrastructure ✅
- **Pendiente**: 21 hooks por migrar/eliminar

---

## 🎯 **OBJETIVO FINAL**

### **Real-Time Final (3-5 suscripciones)**
1. **Chat messages** - Colaboración
2. **Chat notifications** - Alertas
3. **Critical order status** - Workflow
4. **Order assignments** (opcional) - Reasignaciones
5. **Chat conversations** (opcional) - Flujo

### **Polling/Optimistic (Todo lo demás)**
- Orders list → 60s polling
- Order details → 30s polling cuando modal abierto
- System stats → 2min polling
- Activities → 5min polling
- Comments/Attachments → Optimistic updates

**Target**: 80% reducción en suscripciones, 60% mejora en performance