# Detail Hub Kiosk Components

Reusable components for the intelligent kiosk system. All components follow the Notion design system (muted colors, no gradients, flat design).

## Components

### 1. EmployeeHeader

Displays employee information with photo, name, and badges.

**Props:**
- `employee: DetailHubEmployee` - Employee data from database
- `statusBadge?: { text: string; variant: BadgeVariant }` - Optional status badge
- `compact?: boolean` - Compact mode for smaller displays (default: false)

**Example:**
```tsx
import { EmployeeHeader } from '@/components/detail-hub';

<EmployeeHeader
  employee={employee}
  statusBadge={{ text: 'Clocked In', variant: 'success' }}
  compact={false}
/>
```

---

### 2. WeekStatsCard

Displays weekly hour statistics with progress bar.

**Props:**
- `totalHours: number` - Total hours worked this week
- `regularHours: number` - Regular hours (≤40)
- `overtimeHours: number` - Overtime hours (>40)
- `daysWorked: number` - Number of days worked
- `targetHours?: number` - Target hours (default: 40)

**Example:**
```tsx
import { WeekStatsCard } from '@/components/detail-hub';

<WeekStatsCard
  totalHours={42.5}
  regularHours={40}
  overtimeHours={2.5}
  daysWorked={5}
  targetHours={40}
/>
```

---

### 3. NumericKeypad

Visual numeric keypad for PIN entry.

**Props:**
- `onNumberClick: (num: number) => void` - Callback when number clicked
- `onBackspace: () => void` - Callback when backspace clicked
- `onSubmit: () => void` - Callback when submit clicked
- `disabled?: boolean` - Disable all buttons (default: false)

**Example:**
```tsx
import { NumericKeypad } from '@/components/detail-hub';

const [pin, setPin] = useState('');

<NumericKeypad
  onNumberClick={(num) => setPin(pin + num)}
  onBackspace={() => setPin(pin.slice(0, -1))}
  onSubmit={() => handlePinSubmit(pin)}
  disabled={isLoading}
/>
```

---

### 4. PinInputDisplay

Visual PIN input display with boxes (like OTP input).

**Props:**
- `pin: string` - Current PIN value
- `length: number` - Number of digits (4 or 6)
- `error?: boolean` - Show error state (default: false)

**Example:**
```tsx
import { PinInputDisplay } from '@/components/detail-hub';

<PinInputDisplay
  pin="1234"
  length={6}
  error={pinError}
/>
```

---

## Complete Example

```tsx
import { useState } from 'react';
import {
  EmployeeHeader,
  WeekStatsCard,
  NumericKeypad,
  PinInputDisplay
} from '@/components/detail-hub';
import type { DetailHubEmployee } from '@/hooks/useDetailHubDatabase';

export function KioskPinScreen({ employee }: { employee: DetailHubEmployee }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleNumberClick = (num: number) => {
    if (pin.length < 6) {
      setPin(pin + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handleSubmit = async () => {
    if (pin === employee.pin_code) {
      // Success - proceed to clock in/out
    } else {
      setError(true);
    }
  };

  return (
    <div className="space-y-6">
      <EmployeeHeader
        employee={employee}
        statusBadge={{ text: 'Scheduled', variant: 'secondary' }}
      />

      <WeekStatsCard
        totalHours={38.5}
        regularHours={38.5}
        overtimeHours={0}
        daysWorked={5}
      />

      <div className="space-y-4">
        <PinInputDisplay
          pin={pin}
          length={6}
          error={error}
        />

        <NumericKeypad
          onNumberClick={handleNumberClick}
          onBackspace={handleBackspace}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
```

## Design System Compliance

All components follow the MyDetailArea Notion design system:

- **No gradients** - Flat colors only
- **Muted palette** - Gray foundation (slate-50 to gray-900)
- **Accent colors** - Emerald-500 (success), Amber-500 (warning), Red-500 (error)
- **No strong blues** - Avoided blue-600+ variants
- **Enhanced shadows** - card-enhanced class for subtle depth

## Translation Support

All user-facing text uses the translation system:

- **Namespace:** `detail_hub`
- **Keys:** See `public/translations/en/detail_hub.json`
- **Languages:** English, Spanish (ES), Portuguese (PT-BR)

## TypeScript

All components are fully typed with strict TypeScript:

- No `any` types
- Proper interfaces for all props
- Type imports from `@/hooks/useDetailHubDatabase`
