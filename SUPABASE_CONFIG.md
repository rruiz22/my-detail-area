# Supabase Configuration Guide

## Required Environment Variables for Edge Functions

To configure the system for any domain, add these environment variables in Supabase Dashboard:

### 1. Navigate to Supabase Dashboard
- Go to: Project Settings → Edge Functions → Environment Variables

### 2. Add Required Variables

#### BASE_URL Configuration
```
Name: BASE_URL
Value: https://soyk11.com
Description: Base URL for all application links and redirects
```

#### API Keys (if not already configured)
```
Name: MDA_TO_API_KEY
Value: dxCiaUugABsySUjYDzrUrxoAcmVNQshy
Description: API key for mda.to shortlink service
```

## Configuration Impact

### Edge Functions Using BASE_URL:
- **generate-qr-shortlink**: Creates deep links using BASE_URL
- **send-order-email**: Email links use BASE_URL
- **enhanced-sms**: SMS links use BASE_URL

### Frontend Using VITE_BASE_URL:
- **shortLinkService**: Link generation
- **vCardService**: Contact URLs
- **All URL utilities**: Consistent URL building

## URL Patterns After Configuration

### QR Code Flow:
```
QR Scan → https://mda.to/XXXXX → https://soyk11.com/sales-orders?order=uuid
```

### Contact vCards:
```
Contact URL → https://soyk11.com/contacts/contact-id
```

### Email/SMS Links:
```
Order Links → https://soyk11.com/sales-orders?order=uuid
```

## Testing Configuration

After configuring BASE_URL in Supabase Dashboard:

1. **Generate new QR code** for any order
2. **Check Edge Function logs** for BASE_URL usage
3. **Test shortlink redirection** end-to-end
4. **Verify** all URLs use soyk11.com domain

## Troubleshooting

If shortlinks still don't redirect:
1. **Verify BASE_URL** is set in Supabase Dashboard
2. **Check Edge Function logs** for configuration errors
3. **Regenerate QR codes** to use new configuration
4. **Test mda.to API** using test-mda-api function