# KioskSetupWizard - Quick Reference Card

## 🚀 Quick Start (Copy-Paste Ready)

### 1. Import
```typescript
import {
  KioskSetupWizard,
  isKioskConfigured,
  getConfiguredKioskId,
  generateDeviceFingerprint,
  getSystemUsername,
} from "@/components/detail-hub/KioskSetupWizard";
```

### 2. State
```typescript
const [showKioskSetup, setShowKioskSetup] = useState(false);
const [kioskId, setKioskId] = useState<string | null>(null);

useEffect(() => {
  setKioskId(getConfiguredKioskId());
}, []);
```

### 3. Handler
```typescript
const handleTimeClockClick = () => {
  if (!isKioskConfigured()) {
    setShowKioskSetup(true); // Show wizard
  } else {
    setShowTimeClock(true);   // Show time clock
  }
};
```

### 4. Component
```tsx
<KioskSetupWizard
  open={showKioskSetup}
  onClose={() => setShowKioskSetup(false)}
  fingerprint={generateDeviceFingerprint()}
  username={getSystemUsername()}
  onConfigured={(kioskId) => {
    setKioskId(kioskId);
    setShowTimeClock(true);
  }}
/>
```

---

## 📋 Component Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | ✅ | Controls modal visibility |
| `onClose` | `() => void` | ✅ | Callback to close modal |
| `fingerprint` | `string` | ✅ | Device fingerprint (use `generateDeviceFingerprint()`) |
| `username` | `string` | ✅ | Username (use `getSystemUsername()`) |
| `onConfigured` | `(kioskId: string) => void` | ✅ | Callback after successful configuration |

---

## 🔧 Utility Functions

| Function | Return Type | Description | Example |
|----------|-------------|-------------|---------|
| `isKioskConfigured()` | `boolean` | Check if kiosk is configured | `if (!isKioskConfigured()) { ... }` |
| `getConfiguredKioskId()` | `string \| null` | Get configured kiosk UUID | `const id = getConfiguredKioskId()` |
| `clearKioskConfiguration()` | `void` | Clear configuration | `clearKioskConfiguration()` |
| `generateDeviceFingerprint()` | `string` | Generate browser fingerprint | `const fp = generateDeviceFingerprint()` |
| `getSystemUsername()` | `string` | Get platform username | `const user = getSystemUsername()` |

---

## 💾 localStorage Keys

| Key | Value Type | Example | Description |
|-----|------------|---------|-------------|
| `kiosk_id` | UUID string | `"a1b2c3d4-..."` | Selected kiosk UUID |
| `kiosk_device_fingerprint` | Hex string | `"a3f5d2c8b1e4"` | Device fingerprint |
| `kiosk_configured_at` | ISO timestamp | `"2025-11-20T10:30:00Z"` | Configuration timestamp |
| `kiosk_username` | String | `"Chrome on Win32"` | Platform identifier |

---

## 🌐 Translation Keys

All keys under `detail_hub.kiosk_setup` namespace:

| Key | EN | ES | PT-BR |
|-----|----|----|-------|
| `title` | Configure Kiosk for This PC | Configurar Kiosco para Esta PC | Configurar Quiosque para Este PC |
| `configure_button` | Configure This PC | Configurar Esta PC | Configurar Este PC |
| `skip_button` | Skip | Omitir | Pular |
| `success_title` | Kiosk Configured | Kiosco Configurado | Quiosque Configurado |
| `error_title` | Configuration Failed | Configuración Fallida | Configuração Falhou |

**Full list**: 17 keys in `public/translations/{en,es,pt-BR}/detail_hub.json`

---

## 🎨 UI Design Reference

### Colors (Notion-style)
```css
/* Backgrounds */
bg-gray-50   /* #f9fafb - Subtle background */
bg-gray-100  /* #f3f4f6 - Card background */

/* Borders */
border-gray-200  /* #e5e7eb */

/* Text */
text-gray-600  /* #6b7280 - Secondary text */
text-gray-900  /* #111827 - Primary text */

/* Accents */
bg-emerald-600  /* #10b981 - Primary action button */
hover:bg-emerald-700  /* #059669 - Button hover */
```

### Icons
- **Monitor**: Device fingerprint
- **User**: Username
- **Loader2**: Loading state
- **CheckCircle**: Success state
- **Info**: Information alert

---

## 🔒 Security Notes

### ✅ Safe for Production
- Browser-isolated storage (same-origin policy)
- No sensitive data stored
- Privacy-friendly (no tracking)
- User can clear anytime

### ⚠️ Limitations
- Not cryptographically secure
- Can be bypassed by clearing localStorage
- NOT suitable for authentication
- Browser updates may change fingerprint

### 💡 Best Practice
**Use for UX convenience, not security**. Always validate kiosk IDs on the server side.

---

## 🧪 Testing Commands

### Check Configuration Status
```javascript
// In browser console
localStorage.getItem('kiosk_id')           // Returns UUID or null
isKioskConfigured()                        // Returns boolean
getConfiguredKioskId()                     // Returns UUID or null
```

### Reset Configuration
```javascript
// In browser console
clearKioskConfiguration()                  // Clear all kiosk data
localStorage.clear()                       // Nuclear option (clears everything)
```

### Simulate First-Run
```javascript
// 1. Clear localStorage
localStorage.clear()

// 2. Reload page
window.location.reload()

// 3. Click "Time Clock" button
// Result: Wizard should appear
```

---

## 🐛 Common Issues & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| Wizard doesn't show kiosks | No kiosks created | Create kiosks in Kiosk Manager |
| Configuration not persisting | Incognito mode | Use regular browser window |
| Fingerprint changes | Browser extension | Disable fingerprint blocking |
| "Select a kiosk" error | No kiosk selected | Select kiosk before clicking Configure |

---

## 📦 Dependencies

### Required Hooks
- `useDetailHubKiosks` (from `@/hooks/useDetailHubKiosks`)
- `useDealerFilter` (from `@/contexts/DealerFilterContext`)
- `useToast` (from `@/hooks/use-toast`)
- `useTranslation` (from `react-i18next`)

### Required Components
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` (shadcn/ui)
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` (shadcn/ui)
- `Button` (shadcn/ui)
- `Badge` (shadcn/ui)
- `Alert`, `AlertDescription` (shadcn/ui)

---

## 📁 File Locations

```
src/
  components/
    detail-hub/
      KioskSetupWizard.tsx          ← Main component

public/
  translations/
    en/detail_hub.json              ← English translations
    es/detail_hub.json              ← Spanish translations
    pt-BR/detail_hub.json           ← Portuguese translations

docs/
  KIOSK_SETUP_WIZARD_USAGE.md       ← Full documentation
  KIOSK_SETUP_INTEGRATION_EXAMPLE.tsx ← Integration example

KIOSK_SETUP_WIZARD_SUMMARY.md       ← Implementation summary
KIOSK_SETUP_QUICK_REFERENCE.md      ← This file
```

---

## 🔗 Related Components

| Component | Purpose | File |
|-----------|---------|------|
| `PunchClockKioskModal` | Time clock interface | `src/components/detail-hub/PunchClockKioskModal.tsx` |
| `KioskManager` | Admin kiosk management | `src/components/detail-hub/KioskManager.tsx` |
| `useDetailHubKiosks` | Kiosk data fetching | `src/hooks/useDetailHubKiosks.tsx` |

---

## 🎯 Success Criteria

After integration, verify:

- [ ] Wizard appears on first Time Clock click
- [ ] Device info displays correctly
- [ ] Dropdown shows dealership kiosks
- [ ] "Configure" saves to localStorage
- [ ] Success toast appears with kiosk name
- [ ] Time Clock opens after configuration
- [ ] Configuration persists after page refresh
- [ ] "Skip" closes wizard without saving
- [ ] Translations work (EN/ES/PT-BR)

---

## 📞 Support

**Documentation**: See `docs/KIOSK_SETUP_WIZARD_USAGE.md` for comprehensive guide

**Example**: See `docs/KIOSK_SETUP_INTEGRATION_EXAMPLE.tsx` for full integration

**Summary**: See `KIOSK_SETUP_WIZARD_SUMMARY.md` for implementation details

---

**Component Version**: 1.0.0
**Status**: 🟢 Production Ready
**Last Updated**: 2025-11-20
**Translations**: ✅ Complete (EN/ES/PT-BR)
