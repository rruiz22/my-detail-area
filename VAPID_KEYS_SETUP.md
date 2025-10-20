# 🔐 VAPID Keys Configuration for Push Notifications

## 🔑 Generated Keys

**⚠️ IMPORTANT: Keep these keys secure and never commit them to version control!**

### Public Key (Frontend - Safe to expose)
```
BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A
```

### Private Key (Backend Only - KEEP SECRET!)
```
whhN1lt0K0bTF6zSIlPx4I56HSnkxkEvhWC_cDN2bPs
```

---

## 📋 Setup Instructions

### Step 1: Frontend Configuration (.env.local)

Create or update your `.env.local` file:

```bash
# Copy the example file
cp .env.local.example .env.local

# The public key is already set in .env.local.example
VITE_VAPID_PUBLIC_KEY=BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A
```

### Step 2: Supabase Edge Function Secrets

Set the private key as a Supabase secret:

**Via Dashboard:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions** → **Secrets**
4. Add new secrets:
   - `VAPID_PRIVATE_KEY` = `whhN1lt0K0bTF6zSIlPx4I56HSnkxkEvhWC_cDN2bPs`
   - `VAPID_PUBLIC_KEY` = `BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A`
   - `VAPID_SUBJECT` = `mailto:support@mydetailarea.com` (or your email)

**Via CLI:**
```bash
cd C:\Users\rudyr\apps\mydetailarea

npx supabase secrets set VAPID_PRIVATE_KEY=whhN1lt0K0bTF6zSIlPx4I56HSnkxkEvhWC_cDN2bPs
npx supabase secrets set VAPID_PUBLIC_KEY=BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A
npx supabase secrets set VAPID_SUBJECT=mailto:support@mydetailarea.com
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Store private key in Supabase Secrets
- Store public key in .env.local (not committed)
- Use HTTPS in production
- Rotate keys periodically (every 6-12 months)

### ❌ DON'T:
- Commit .env.local to git (.gitignore already includes it)
- Share private key publicly
- Hardcode keys in source code
- Use same keys for dev/staging/production

---

## 🧪 Testing Keys

After configuration, test that keys are accessible:

**Frontend:**
```typescript
console.log('VAPID Public Key:', import.meta.env.VITE_VAPID_PUBLIC_KEY);
// Should output: BC6DN8DGXQOK...
```

**Edge Function:**
```typescript
console.log('VAPID Keys configured:', {
  public: !!Deno.env.get('VAPID_PUBLIC_KEY'),
  private: !!Deno.env.get('VAPID_PRIVATE_KEY'),
  subject: Deno.env.get('VAPID_SUBJECT')
});
// Should output: { public: true, private: true, subject: 'mailto:...' }
```

---

## 🔄 Regenerating Keys

If you need to regenerate keys (e.g., keys compromised):

```bash
cd C:\Users\rudyr\apps\mydetailarea
npx web-push generate-vapid-keys --json
```

Then update both frontend (.env.local) and backend (Supabase Secrets).

**⚠️ WARNING:** Regenerating keys will invalidate all existing push subscriptions. Users will need to re-subscribe.

---

## 📚 References

- [Web Push Protocol RFC](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [MDN Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

---

**Keys generated:** 2025-10-17
**Valid for:** Push notifications in My Detail Area - Get Ready Module
**Status:** ✅ Ready to use (after configuration)
