---
name: mydetailarea-testing
description: Comprehensive E2E testing suite for MyDetailArea dealership workflows. Implements Playwright test scenarios for critical user journeys including order creation, invoice generation, payment processing, VIN scanning, and team collaboration. Includes role-based testing, performance benchmarks, visual regression, and CI/CD integration. Use when implementing automated testing for dealership operations.
license: MIT
---

# MyDetailArea E2E Testing Suite

Comprehensive end-to-end testing framework for dealership management workflows with Playwright, Vitest, and Testing Library.

## Purpose

Provide robust, automated testing coverage for critical dealership workflows ensuring reliability, performance, and regression prevention across the MyDetailArea platform.

## When to Use

Use this skill when:
- Implementing E2E tests for order workflows
- Testing role-based permissions (admin, manager, user)
- Creating regression test suites
- Setting up CI/CD test automation
- Testing multi-language support (EN/ES/PT-BR)
- Validating complex user journeys
- Performance benchmarking
- Visual regression testing
- Testing real-time features (chat, notifications)

## Testing Stack

### E2E Testing
- **Playwright 1.55.0** - Browser automation
- **@playwright/test** - Test runner

### Unit Testing
- **Vitest 3.2.4** - Unit test framework
- **Testing Library** - React component testing
- **@testing-library/react** - Component utilities
- **@testing-library/user-event** - User interaction simulation

### Utilities
- **MSW (Mock Service Worker)** - API mocking
- **@faker-js/faker** - Test data generation

## Project Paths

- **Tests:** `C:\Users\rudyr\apps\mydetailarea\tests\`
- **E2E:** `C:\Users\rudyr\apps\mydetailarea\tests\e2e\`
- **Unit:** `C:\Users\rudyr\apps\mydetailarea\tests\unit\`
- **Playwright Config:** `C:\Users\rudyr\apps\mydetailarea\playwright.config.ts`
- **Vitest Config:** `C:\Users\rudyr\apps\mydetailarea\vitest.config.ts`

## Critical Test Scenarios

### 1. Order Creation Flow (Service)

```typescript
// tests/e2e/orders/create-service-order.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Service Order Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as dealer_manager
    await page.goto('http://localhost:8080/auth');
    await page.fill('[name="email"]', 'manager@dealer.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:8080/dashboard');
  });

  test('should create service order with vehicle info', async ({ page }) => {
    // Navigate to service orders
    await page.click('a[href="/service"]');
    await expect(page).toHaveURL('http://localhost:8080/service');

    // Click create button
    await page.click('button:has-text("New Service Order")');

    // Fill vehicle information
    await page.fill('[name="vin"]', '1HGBH41JXMN109186');
    await page.fill('[name="make"]', 'Honda');
    await page.fill('[name="model"]', 'Accord');
    await page.fill('[name="year"]', '2021');

    // Fill customer information
    await page.fill('[name="customer_name"]', 'John Doe');
    await page.fill('[name="customer_email"]', 'john@example.com');
    await page.fill('[name="customer_phone"]', '+15551234567');

    // Add service
    await page.click('button:has-text("Add Service")');
    await page.fill('[name="services[0].service_name"]', 'Oil Change');
    await page.fill('[name="services[0].price"]', '49.99');

    // Save order
    await page.click('button:has-text("Create Order")');

    // Verify success
    await expect(page.locator('.toast')).toContainText('Order created successfully');
    await expect(page).toHaveURL(/\/service\/[a-f0-9-]{36}$/);

    // Verify order details
    await expect(page.locator('h1')).toContainText('John Doe');
    await expect(page.locator('text=Honda Accord')).toBeVisible();
    await expect(page.locator('text=Oil Change')).toBeVisible();
  });

  test('should validate VIN format', async ({ page }) => {
    await page.click('a[href="/service"]');
    await page.click('button:has-text("New Service Order")');

    // Enter invalid VIN (too short)
    await page.fill('[name="vin"]', 'INVALID');
    await page.fill('[name="customer_name"]', 'Test');
    await page.click('button:has-text("Create Order")');

    // Should show validation error
    await expect(page.locator('text=/VIN must be 17 characters/i')).toBeVisible();
  });
});
```

### 2. Invoice Generation & Payment

```typescript
// tests/e2e/invoices/invoice-workflow.spec.ts
test.describe('Invoice Workflow', () => {
  let orderId: string;

  test.beforeEach(async ({ page }) => {
    // Create completed order first
    orderId = await createTestOrder(page, { status: 'completed' });
  });

  test('should generate invoice from completed order', async ({ page }) => {
    // Navigate to order
    await page.goto(`http://localhost:8080/service/${orderId}`);

    // Generate invoice
    await page.click('button:has-text("Generate Invoice")');

    // Verify invoice dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Invoice Preview')).toBeVisible();

    // Verify items
    await expect(page.locator('text=Oil Change')).toBeVisible();
    await expect(page.locator('text=$49.99')).toBeVisible();

    // Set due date
    await page.fill('[name="due_date"]', '2025-11-18');

    // Create invoice
    await page.click('button:has-text("Create Invoice")');

    // Verify success
    await expect(page.locator('.toast')).toContainText('Invoice created');

    // Navigate to invoice
    await page.click('a:has-text("View Invoice")');
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9-]{36}$/);
  });

  test('should record payment on invoice', async ({ page }) => {
    // Create invoice first
    const invoiceId = await createTestInvoice(page, orderId);

    // Navigate to invoice
    await page.goto(`http://localhost:8080/invoices/${invoiceId}`);

    // Click record payment
    await page.click('button:has-text("Record Payment")');

    // Fill payment details
    await page.fill('[name="amount"]', '49.99');
    await page.selectOption('[name="payment_method"]', 'credit_card');
    await page.fill('[name="reference_number"]', 'TX123456');

    // Submit
    await page.click('button:has-text("Record Payment")');

    // Verify status changed to paid
    await expect(page.locator('text=Paid')).toBeVisible();
    await expect(page.locator('text=Amount Due: $0.00')).toBeVisible();
  });
});
```

### 3. Permission-Based Testing

```typescript
// tests/e2e/permissions/role-access.spec.ts
test.describe('Role-Based Access Control', () => {
  const roles = [
    { role: 'dealer_user', email: 'user@dealer.com' },
    { role: 'dealer_manager', email: 'manager@dealer.com' },
    { role: 'dealer_admin', email: 'admin@dealer.com' }
  ];

  for (const { role, email } of roles) {
    test.describe(`${role} permissions`, () => {
      test.beforeEach(async ({ page }) => {
        await loginAs(page, email);
      });

      test('should have correct module access', async ({ page }) => {
        // Check navigation visibility based on role
        if (role === 'dealer_user') {
          await expect(page.locator('a[href="/management"]')).not.toBeVisible();
          await expect(page.locator('a[href="/reports"]')).toBeVisible();
        }

        if (role === 'dealer_admin') {
          await expect(page.locator('a[href="/management"]')).toBeVisible();
          await expect(page.locator('a[href="/users"]')).toBeVisible();
        }
      });

      test('should enforce write permissions', async ({ page }) => {
        await page.goto('http://localhost:8080/contacts');

        if (role === 'dealer_user') {
          // Should not see create button
          await expect(page.locator('button:has-text("Add Contact")')).not.toBeVisible();
        } else {
          // Should see create button
          await expect(page.locator('button:has-text("Add Contact")')).toBeVisible();
        }
      });
    });
  }
});
```

### 4. Multi-Language Testing

```typescript
// tests/e2e/i18n/translations.spec.ts
test.describe('Multi-Language Support', () => {
  const languages = [
    { code: 'en', name: 'English', greeting: 'Dashboard' },
    { code: 'es', name: 'Español', greeting: 'Tablero' },
    { code: 'pt-BR', name: 'Português', greeting: 'Painel' }
  ];

  for (const lang of languages) {
    test(`should display UI in ${lang.name}`, async ({ page }) => {
      await page.goto('http://localhost:8080');

      // Change language
      await page.click('button[aria-label="Language"]');
      await page.click(`button:has-text("${lang.name}")`);

      // Wait for translation
      await page.waitForTimeout(500);

      // Verify translation
      await expect(page.locator(`text=${lang.greeting}`)).toBeVisible();
    });
  }
});
```

### 5. Real-Time Features Testing

```typescript
// tests/e2e/realtime/notifications.spec.ts
test.describe('Real-Time Notifications', () => {
  test('should receive notification when order is updated', async ({ browser }) => {
    // Create two browser contexts (two users)
    const managerContext = await browser.newContext();
    const techContext = await browser.newContext();

    const managerPage = await managerContext.newPage();
    const techPage = await techContext.newPage();

    // Login as manager
    await loginAs(managerPage, 'manager@dealer.com');

    // Login as tech (follower)
    await loginAs(techPage, 'tech@dealer.com');

    // Create order as manager
    const orderId = await createTestOrder(managerPage);

    // Tech follows the order
    await techPage.goto(`http://localhost:8080/service/${orderId}`);
    await techPage.click('button:has-text("Follow")');

    // Manager updates order status
    await managerPage.goto(`http://localhost:8080/service/${orderId}`);
    await managerPage.selectOption('[name="status"]', 'in_progress');
    await managerPage.click('button:has-text("Save")');

    // Tech should receive notification
    await expect(techPage.locator('.notification-badge')).toHaveText('1');
    await techPage.click('.notification-bell');
    await expect(techPage.locator('text=/Order.*updated/i')).toBeVisible();

    // Cleanup
    await managerContext.close();
    await techContext.close();
  });
});
```

## Unit Testing Patterns

### Component Testing

```typescript
// tests/unit/components/MetricCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MetricCard } from '@/components/ui/metric-card';

describe('MetricCard', () => {
  it('should render label and value', () => {
    render(
      <MetricCard
        label="Total Orders"
        value="156"
        icon={TrendingUp}
      />
    );

    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('156')).toBeInTheDocument();
  });

  it('should display trend indicator', () => {
    render(
      <MetricCard
        label="Revenue"
        value="$12,345"
        trend={{ value: 12, direction: 'up' }}
        icon={DollarSign}
      />
    );

    expect(screen.getByText(/12%/i)).toBeInTheDocument();
    expect(screen.getByText(/12%/i)).toHaveClass('text-emerald-600');
  });
});
```

### Hook Testing

```typescript
// tests/unit/hooks/useInvoices.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useInvoices } from '@/hooks/useInvoices';
import { wrapper } from '../test-utils';

describe('useInvoices', () => {
  it('should fetch invoices', async () => {
    const { result } = renderHook(() => useInvoices({ dealer_id: 1 }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(5);
    expect(result.current.data[0]).toHaveProperty('invoice_number');
  });

  it('should filter by status', async () => {
    const { result } = renderHook(
      () => useInvoices({ dealer_id: 1, status: 'paid' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data.every(inv => inv.status === 'paid')).toBe(true);
  });
});
```

## Visual Regression Testing

```typescript
// tests/visual/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('dashboard should match snapshot', async ({ page }) => {
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('invoice template should match snapshot', async ({ page }) => {
    const invoiceId = await createTestInvoice(page);
    await page.goto(`http://localhost:8080/invoices/${invoiceId}/print`);

    await expect(page).toHaveScreenshot('invoice-template.png');
  });
});
```

## Performance Testing

```typescript
// tests/performance/load-times.spec.ts
test.describe('Performance Benchmarks', () => {
  test('dashboard should load within 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:8080/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('order creation should complete within 1 second', async ({ page }) => {
    await page.goto('http://localhost:8080/service');

    const startTime = Date.now();

    await page.click('button:has-text("New Service Order")');
    await page.waitForSelector('[role="dialog"]');

    const renderTime = Date.now() - startTime;

    expect(renderTime).toBeLessThan(1000);
  });
});
```

## Test Data Factories

```typescript
// tests/factories/order.factory.ts
import { faker } from '@faker-js/faker';

export function createOrderData(overrides = {}) {
  return {
    customer_name: faker.person.fullName(),
    customer_email: faker.internet.email(),
    customer_phone: faker.phone.number('+1##########'),
    vin: generateVIN(),
    make: faker.vehicle.manufacturer(),
    model: faker.vehicle.model(),
    year: faker.date.past({ years: 10 }).getFullYear(),
    services: [
      {
        service_name: 'Oil Change',
        price: 49.99,
        estimated_time: 30
      }
    ],
    status: 'pending',
    dealer_id: 1,
    ...overrides
  };
}

function generateVIN(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  return Array.from({ length: 17 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run unit tests
        run: npm run test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Utilities

```typescript
// tests/utils/test-helpers.ts
export async function loginAs(page: Page, email: string) {
  await page.goto('http://localhost:8080/auth');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', 'testpassword');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:8080/dashboard');
}

export async function createTestOrder(
  page: Page,
  overrides = {}
): Promise<string> {
  const orderData = createOrderData(overrides);

  const response = await page.request.post('http://localhost:8080/api/orders', {
    data: orderData
  });

  const { id } = await response.json();
  return id;
}

export async function createTestInvoice(
  page: Page,
  orderId: string
): Promise<string> {
  const response = await page.request.post('http://localhost:8080/api/invoices', {
    data: { order_id: orderId }
  });

  const { id } = await response.json();
  return id;
}
```

## Best Practices

1. **Test User Journeys** - Focus on complete workflows, not isolated actions
2. **Use Data Factories** - Generate realistic test data
3. **Isolated Tests** - Each test should be independent
4. **Clean State** - Reset database between test suites
5. **Explicit Waits** - Use waitForSelector, not arbitrary timeouts
6. **Descriptive Names** - Test names should explain what they verify
7. **Test Pyramid** - More unit tests, fewer E2E tests
8. **CI/CD Integration** - Run tests on every commit
9. **Visual Regression** - Catch UI regressions automatically
10. **Performance Budgets** - Enforce load time limits

## Reference Files

- **[Test Patterns](./references/test-patterns.md)** - Common test scenarios
- **[Data Factories](./references/data-factories.md)** - Test data generation
- **[CI/CD Setup](./references/cicd-setup.md)** - GitHub Actions configuration

## Examples

- **[examples/order-workflow.spec.ts](./examples/order-workflow.spec.ts)** - Complete order testing
- **[examples/permission-tests.spec.ts](./examples/permission-tests.spec.ts)** - Role-based tests
- **[examples/component-tests.tsx](./examples/component-tests.tsx)** - Unit test examples
