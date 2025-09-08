import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { NotificationProvider } from '@/components/NotificationProvider';
import { Toaster } from '@/components/ui/sonner';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <BrowserRouter>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PermissionProvider>
              <NotificationProvider>
                {children}
                <Toaster />
              </NotificationProvider>
            </PermissionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render, userEvent };

// Mock user data for tests
export const mockUser = {
  id: 'mock-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user' as const,
  dealership_id: 1,
  active: true,
};

export const mockOrder = {
  id: '1',
  vin: 'TEST123456789',
  year: 2023,
  make: 'Toyota',
  model: 'Camry',
  customer_name: 'John Doe',
  customer_phone: '+1234567890',
  customer_email: 'john@example.com',
  status: 'pending' as const,
  department: 'sales' as const,
  service_type: 'oil_change',
  price: 50.00,
  notes: 'Test order notes',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  dealer_id: 1,
};

export const mockDealership = {
  id: 1,
  name: 'Test Dealership',
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  zip_code: '12345',
  phone: '+1234567890',
  email: 'test@dealership.com',
  active: true,
};