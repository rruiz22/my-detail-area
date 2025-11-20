# KioskSetupWizard - Usage Guide

## Overview

The `KioskSetupWizard` component provides a first-run configuration experience for linking a PC/browser to an existing kiosk configuration. This allows administrators to set up dedicated time clock stations without requiring database-level configuration.

## Component Location

```
src/components/detail-hub/KioskSetupWizard.tsx
```

## Features

- **Device Fingerprinting**: Generates browser-based unique ID
- **Username Detection**: Shows OS/browser identifier
- **Kiosk Selection**: Dropdown of available kiosks from dealership
- **Persistent Configuration**: Saves to localStorage (survives browser restarts)
- **Skip Option**: For non-kiosk PCs (admins/managers accessing time clock)
- **Multi-language Support**: EN/ES/PT-BR translations included

## Architecture

### Storage Strategy

The wizard uses **localStorage** to persist kiosk configuration:

```typescript
localStorage.setItem('kiosk_id', selectedKioskId);           // UUID
localStorage.setItem('kiosk_device_fingerprint', fingerprint); // 12-char hex
localStorage.setItem('kiosk_configured_at', timestamp);      // ISO 8601
localStorage.setItem('kiosk_username', username);            // OS username
```

### Device Fingerprinting

The `generateDeviceFingerprint()` utility creates a browser-based unique ID using:

- User agent string
- Screen resolution
- Color depth
- Timezone offset
- Storage availability

**Note**: This is NOT cryptographically secure, just a stable identifier for the browser instance.

## Integration Examples

### Example 1: Basic Integration in DetailHubDashboard

```tsx
import { useState, useEffect } from "react";
import { PunchClockKioskModal } from "./PunchClockKioskModal";
import {
  KioskSetupWizard,
  isKioskConfigured,
  getConfiguredKioskId,
  generateDeviceFingerprint,
  getSystemUsername
} from "./KioskSetupWizard";

export function DetailHubDashboard() {
  const [showTimeClock, setShowTimeClock] = useState(false);
  const [showKioskSetup, setShowKioskSetup] = useState(false);
  const [kioskId, setKioskId] = useState<string | null>(null);

  // Check if kiosk is configured on mount
  useEffect(() => {
    const configuredId = getConfiguredKioskId();
    setKioskId(configuredId);
  }, []);

  // Handle Time Clock button click
  const handleTimeClockClick = () => {
    if (!isKioskConfigured()) {
      // Show wizard if not configured
      setShowKioskSetup(true);
    } else {
      // Show time clock directly
      setShowTimeClock(true);
    }
  };

  return (
    <div>
      <Button onClick={handleTimeClockClick}>
        <Clock className="w-4 h-4 mr-2" />
        Time Clock
      </Button>

      {/* Kiosk Setup Wizard */}
      <KioskSetupWizard
        open={showKioskSetup}
        onClose={() => setShowKioskSetup(false)}
        fingerprint={generateDeviceFingerprint()}
        username={getSystemUsername()}
        onConfigured={(configuredKioskId) => {
          setKioskId(configuredKioskId);
          setShowTimeClock(true); // Open time clock after configuration
        }}
      />

      {/* Time Clock Modal */}
      <PunchClockKioskModal
        open={showTimeClock}
        onClose={() => setShowTimeClock(false)}
        kioskId={kioskId || undefined}
      />
    </div>
  );
}
```

### Example 2: Auto-Show Wizard on First Load

```tsx
import { useState, useEffect } from "react";
import {
  KioskSetupWizard,
  isKioskConfigured,
  generateDeviceFingerprint,
  getSystemUsername
} from "./KioskSetupWizard";

export function KioskStationApp() {
  const [showWizard, setShowWizard] = useState(false);

  // Check configuration on mount
  useEffect(() => {
    // Show wizard if not configured
    if (!isKioskConfigured()) {
      setShowWizard(true);
    }
  }, []);

  return (
    <div>
      <h1>Time Clock Station</h1>

      {/* Wizard appears automatically on first run */}
      <KioskSetupWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        fingerprint={generateDeviceFingerprint()}
        username={getSystemUsername()}
        onConfigured={(kioskId) => {
          console.log('Kiosk configured:', kioskId);
          setShowWizard(false);
        }}
      />
    </div>
  );
}
```

### Example 3: Admin Override - Reconfigure Kiosk

```tsx
import { Button } from "@/components/ui/button";
import {
  KioskSetupWizard,
  clearKioskConfiguration,
  generateDeviceFingerprint,
  getSystemUsername
} from "./KioskSetupWizard";

export function KioskSettings() {
  const [showWizard, setShowWizard] = useState(false);

  const handleReconfigure = () => {
    // Clear existing configuration
    clearKioskConfiguration();

    // Show wizard
    setShowWizard(true);
  };

  return (
    <div>
      <h2>Kiosk Configuration</h2>

      <Button onClick={handleReconfigure} variant="outline">
        Reconfigure This Kiosk
      </Button>

      <KioskSetupWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        fingerprint={generateDeviceFingerprint()}
        username={getSystemUsername()}
        onConfigured={(kioskId) => {
          console.log('Reconfigured to:', kioskId);
          window.location.reload(); // Reload to apply new config
        }}
      />
    </div>
  );
}
```

## Utility Functions

### `isKioskConfigured(): boolean`

Checks if the current browser has been configured as a kiosk.

```typescript
if (!isKioskConfigured()) {
  // Show setup wizard
}
```

### `getConfiguredKioskId(): string | null`

Returns the configured kiosk UUID, or `null` if not configured.

```typescript
const kioskId = getConfiguredKioskId();
if (kioskId) {
  // Use kiosk ID in time clock operations
}
```

### `clearKioskConfiguration(): void`

Removes all kiosk configuration from localStorage.

```typescript
clearKioskConfiguration(); // Reset to unconfigured state
```

### `generateDeviceFingerprint(): string`

Generates a browser-based unique identifier (12-character hex string).

```typescript
const fingerprint = generateDeviceFingerprint(); // e.g., "a3f5d2c8b1e4"
```

### `getSystemUsername(): string`

Returns a friendly username identifier (browser/platform info).

```typescript
const username = getSystemUsername(); // e.g., "Google Inc. on Win32"
```

## Translation Keys

All UI text is fully translated in 3 languages:

| Key | English | Spanish | Portuguese |
|-----|---------|---------|------------|
| `detail_hub.kiosk_setup.title` | Configure Kiosk for This PC | Configurar Kiosco para Esta PC | Configurar Quiosque para Este PC |
| `detail_hub.kiosk_setup.subtitle` | Link this computer to a kiosk configuration | Vincular esta computadora a una configuración de kiosco | Vincular este computador a uma configuração de quiosque |
| `detail_hub.kiosk_setup.configure_button` | Configure This PC | Configurar Esta PC | Configurar Este PC |
| `detail_hub.kiosk_setup.skip_button` | Skip | Omitir | Pular |
| `detail_hub.kiosk_setup.success_message` | This PC has been configured as {{kioskName}} | Esta PC ha sido configurada como {{kioskName}} | Este PC foi configurado como {{kioskName}} |

**Full translation files:**
- `public/translations/en/detail_hub.json`
- `public/translations/es/detail_hub.json`
- `public/translations/pt-BR/detail_hub.json`

## Component Props

```typescript
export interface KioskSetupWizardProps {
  /** Controls modal visibility */
  open: boolean;

  /** Callback to close modal */
  onClose: () => void;

  /** Device fingerprint (first 12 chars displayed) */
  fingerprint: string;

  /** Detected username from OS or browser */
  username: string;

  /** Callback after successful configuration */
  onConfigured: (kioskId: string) => void;
}
```

## UI/UX Design

### Modal Layout

```
┌─────────────────────────────────────────────┐
│ Configure Kiosk for This PC                 │
│ Link this computer to a kiosk configuration │
├─────────────────────────────────────────────┤
│                                             │
│ Device Information                          │
│ ┌─────────────────────────────────────────┐ │
│ │ 📺 Device Fingerprint    [A3F5D2C8B1E4] │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 👤 Username              [Chrome/Win32] │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Select Kiosk                                │
│ ┌─────────────────────────────────────────┐ │
│ │ Front Desk Kiosk • KIOSK-001 • Lobby    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ℹ️ This configuration will be saved to     │
│    this browser and persists across        │
│    sessions.                               │
│                                             │
├─────────────────────────────────────────────┤
│  [   Skip   ]     [✓ Configure This PC]    │
└─────────────────────────────────────────────┘
```

### Design Principles

- **Notion-style**: Gray-based palette, no gradients
- **Emerald accent**: Primary action button (configure)
- **Clear information hierarchy**: Device info → Selection → Action
- **Responsive**: Works on tablets and desktops
- **Accessible**: Proper ARIA labels, keyboard navigation

## Flow Diagram

```
┌─────────────────────────────────────────┐
│  User clicks "Time Clock" button        │
└────────────────┬────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ isKiosk       │
         │ Configured?   │
         └───────┬───────┘
                 │
        ┌────────┴────────┐
        │                 │
       YES               NO
        │                 │
        ▼                 ▼
┌───────────────┐  ┌──────────────────┐
│ Open Time     │  │ Show Kiosk Setup │
│ Clock Modal   │  │ Wizard           │
└───────────────┘  └────────┬─────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                 Configure          Skip
                    │                 │
                    ▼                 ▼
            ┌───────────────┐  ┌──────────┐
            │ Save to       │  │ Close    │
            │ localStorage  │  │ Wizard   │
            └───────┬───────┘  └──────────┘
                    │
                    ▼
            ┌───────────────┐
            │ Open Time     │
            │ Clock Modal   │
            └───────────────┘
```

## Security Considerations

### Device Fingerprinting Limitations

1. **Not cryptographically secure**: The fingerprint is based on browser characteristics
2. **Can change**: Browser updates, resolution changes can alter fingerprint
3. **Not suitable for authentication**: Should NOT be used as a security token
4. **Privacy-friendly**: No server-side tracking, all data stored locally

### localStorage Security

- **Browser-isolated**: Data only accessible from same origin
- **User can clear**: Users can clear browser data and reset configuration
- **No sensitive data**: Only stores kiosk UUID (public identifier)

### Recommended Usage

- **Convenience, not security**: Kiosk setup is for UX convenience
- **Server-side validation**: Always validate kiosk IDs on server
- **Regular audits**: Admins should audit kiosk assignments in Kiosk Manager

## Troubleshooting

### Wizard doesn't show available kiosks

**Cause**: No kiosks created in dealership yet

**Solution**:
1. Go to "Kiosks" tab
2. Click "Add Kiosk"
3. Create at least one kiosk configuration
4. Return to setup wizard

### Configuration not persisting

**Cause**: Browser is in private/incognito mode

**Solution**: Use regular browser window, not private mode

### Fingerprint changes on each reload

**Cause**: Canvas fingerprinting disabled by browser extensions

**Solution**: Disable fingerprint protection for this domain

## Testing

### Manual Test Checklist

- [ ] Wizard shows when kiosk not configured
- [ ] Device fingerprint displays correctly (12 chars)
- [ ] Username shows browser/platform info
- [ ] Dropdown shows all dealership kiosks
- [ ] "Configure" button saves to localStorage
- [ ] "Skip" button closes wizard without saving
- [ ] Success toast shows kiosk name
- [ ] Configuration persists after page refresh
- [ ] Time Clock opens after configuration

### Test with Multiple Dealerships

```typescript
// Test 1: System admin (sees all kiosks)
selectedDealerId = 'all'
// Should show kiosks from all dealerships

// Test 2: Specific dealership
selectedDealerId = 123
// Should only show kiosks from dealership 123
```

## Future Enhancements

### Phase 2: Enhanced Device Tracking

- [ ] Store MAC address (if available)
- [ ] Track IP address history
- [ ] Device rename capability in UI
- [ ] Admin device management dashboard

### Phase 3: Multi-Kiosk Support

- [ ] Support multiple kiosk profiles per device
- [ ] Quick-switch between kiosks
- [ ] Schedule-based automatic switching

### Phase 4: Enterprise Features

- [ ] QR code configuration (scan to configure)
- [ ] NFC tag support for instant setup
- [ ] Remote device management API
- [ ] Real-time device health monitoring

## Related Components

- **PunchClockKioskModal**: Main time clock interface
- **KioskManager**: Admin interface for creating/managing kiosks
- **useDetailHubKiosks**: Hook for fetching kiosk data

## Support

For issues or questions:
1. Check translation keys are loaded
2. Verify kiosks exist in database
3. Check browser console for errors
4. Test in non-incognito window
5. Clear localStorage and retry

---

**Component Status**: ✅ Production Ready
**Translations**: ✅ EN/ES/PT-BR Complete
**Tests**: ⚠️ Manual testing only (E2E tests pending)
**Documentation**: ✅ Complete
