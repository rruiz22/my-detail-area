import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Supabase auth endpoints
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
      },
    });
  }),

  // Mock orders API
  http.get('*/rest/v1/orders', () => {
    return HttpResponse.json([
      {
        id: '1',
        vin: 'TEST123456789',
        year: 2023,
        make: 'Toyota',
        model: 'Camry',
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        status: 'pending',
        department: 'sales',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }),

  // Mock dealerships API
  http.get('*/rest/v1/dealerships', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Dealership',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345',
        phone: '+1234567890',
        email: 'test@dealership.com',
        active: true,
      },
    ]);
  }),

  // Mock user profiles API
  http.get('*/rest/v1/user_profiles', () => {
    return HttpResponse.json([
      {
        id: 'mock-user-id',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        dealership_id: 1,
        active: true,
      },
    ]);
  }),

  // Mock Edge Functions
  http.post('*/functions/v1/decode-vin', () => {
    return HttpResponse.json({
      year: '2023',
      make: 'Toyota',
      model: 'Camry',
      trim: 'LE',
      vehicleInfo: '2023 Toyota Camry LE',
      vehicleType: 'PASSENGER CAR',
      bodyClass: 'SEDAN',
    });
  }),

  http.post('*/functions/v1/generate-qr-shortlink', () => {
    return HttpResponse.json({
      qrCodeUrl: 'data:image/png;base64,mock-qr-code',
      shortLink: 'https://mda.to/ABC12',
    });
  }),

  http.post('*/functions/v1/send-sms', () => {
    return HttpResponse.json({
      success: true,
      message: 'SMS sent successfully',
    });
  }),

  http.post('*/functions/v1/send-order-email', () => {
    return HttpResponse.json({
      success: true,
      message: 'Email sent successfully',
    });
  }),
];