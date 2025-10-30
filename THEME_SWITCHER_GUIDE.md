# 🎨 Theme Switcher Guide

## Overview

The application now supports **two design systems**:

1. **Apple Design System** (DEFAULT) - Vibrant, modern, and colorful
2. **Notion Design System** (ALTERNATIVE) - Minimal, subtle, and professional

Both themes support **light** and **dark** modes.

---

## 🍎 Apple Theme (Default)

The Apple theme is inspired by Apple's Human Interface Guidelines:

### Light Mode Colors:
- **Primary**: Apple Blue `hsl(211 100% 50%)` - Vibrant and confident
- **Success**: Apple Green `hsl(142 76% 36%)`
- **Warning**: Apple Orange `hsl(35 91% 49%)`
- **Destructive**: Apple Red `hsl(0 100% 45%)`
- **Background**: Clean white with subtle warmth
- **Radius**: 0.75rem (slightly rounded for modern feel)

### Dark Mode Colors:
- **Background**: True black `hsl(0 0% 7%)`
- **Primary**: Bright Apple Blue `hsl(211 100% 55%)`
- Enhanced contrast for readability

---

## 📝 Notion Theme (Alternative)

The Notion theme uses their signature subtle, professional aesthetic:

### Light Mode Colors:
- **Primary**: Notion Gray `hsl(0 0% 9%)` - Dark and minimal
- **Accent**: Muted Indigo `hsl(239 84% 67%)`
- **Background**: Pure white
- **Radius**: 0.5rem (subtle rounded corners)

### Dark Mode Colors:
- **Background**: Dark charcoal `hsl(0 0% 9%)`
- **Primary**: Light foreground `hsl(0 0% 98%)`

---

## 🔄 How to Switch Themes

### Method 1: Manual Toggle (Recommended)

Add or remove the `.theme-notion` class to the `<body>` or `<html>` element:

```tsx
// Switch to Notion theme
document.body.classList.add('theme-notion');

// Switch back to Apple theme (default)
document.body.classList.remove('theme-notion');
```

### Method 2: Create a Theme Context

Create a React context for theme management:

```tsx
// src/contexts/ThemeContext.tsx
import { createContext, useContext, useState } from 'react';

type Theme = 'apple' | 'notion';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: 'apple',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('apple');

  useEffect(() => {
    if (theme === 'notion') {
      document.body.classList.add('theme-notion');
    } else {
      document.body.classList.remove('theme-notion');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### Method 3: Settings Panel

Add a theme switcher to your settings:

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <h3>Design System</h3>
      <div className="flex gap-2">
        <button
          onClick={() => setTheme('apple')}
          className={theme === 'apple' ? 'active' : ''}
        >
          🍎 Apple
        </button>
        <button
          onClick={() => setTheme('notion')}
          className={theme === 'notion' ? 'active' : ''}
        >
          📝 Notion
        </button>
      </div>
    </div>
  );
}
```

---

## 🎯 Quick Test

To quickly test both themes, open the browser console and run:

```javascript
// Test Notion theme
document.body.classList.add('theme-notion');

// Back to Apple theme (wait a few seconds to see the difference)
setTimeout(() => {
  document.body.classList.remove('theme-notion');
}, 5000);
```

---

## 📊 Visual Comparison

| Feature | Apple Theme | Notion Theme |
|---------|-------------|--------------|
| **Primary Color** | Vibrant Blue | Dark Gray |
| **Border Radius** | 0.75rem | 0.5rem |
| **Shadows** | Softer, natural | Subtle, minimal |
| **Accent** | Blue | Muted Indigo |
| **Feel** | Modern, colorful | Professional, minimal |

---

## 💡 Best Practices

1. **Persist User Choice**: Store the selected theme in `localStorage`:
   ```tsx
   localStorage.setItem('theme', theme);
   ```

2. **System Preference**: Optionally respect user's system preference:
   ```tsx
   const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
   ```

3. **Smooth Transition**: Add transition to theme changes:
   ```css
   body {
     transition: background-color 0.3s ease, color 0.3s ease;
   }
   ```

---

## 🔧 Technical Notes

- All colors are defined in HSL format for consistency
- Theme switching is instant (no page reload required)
- Both themes work seamlessly with light/dark mode toggle
- The `.theme-notion` class can be applied at any level in the DOM tree
- CSS custom properties cascade properly for both themes

---

## 🚀 Current Default

**Apple Theme** is set as the default. To change the default to Notion, add `.theme-notion` to your root `<html>` or `<body>` element in `index.html`.
