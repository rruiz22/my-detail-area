# Firebase Cloud Messaging (FCM) Implementation

**Implementation Date:** 2025-10-18
**Status:** ✅ Ready for Installation & Testing
**Approach:** CONSERVATIVE (Parallel to existing web-push)

## Executive Summary

This is a **NEW, PARALLEL** implementation of push notifications using Firebase Cloud Messaging (FCM) as an alternative to the existing web-push system. The implementation is completely additive and reversible.

### Why FCM?

The current web-push implementation has reliability issues:
- ❌ Notifications send successfully (201) but never appear
- ❌ Service Worker doesn't receive push events
- ❌ web-push library has compatibility issues with Deno

FCM offers:
- ✅ Better reliability (Firebase infrastructure)
- ✅ Simplified token management
- ✅ Native Deno compatibility (no problematic npm packages)
- ✅ Better error handling and debugging

## What Was Created

### 🎨 Frontend Files (3 files)
```
src/
├── config/
│   └── firebase.ts                    # Firebase initialization & config
└── hooks/
    └── useFCMNotifications.tsx        # React hook for FCM (parallel to usePushNotifications)

public/
└── firebase-messaging-sw.js           # Service Worker for FCM (parallel to sw.js)
```

### ⚙️ Backend Files (2 files)
```
supabase/
├── functions/
│   └── push-notification-fcm/         # NEW Edge Function
│       ├── index.ts                   # FCM notification sender
│       └── deno.json                  # Deno configuration
└── migrations/
    └── 20251018000001_create_fcm_tokens_table.sql  # Database table
```

### 📚 Documentation Files (6 files)
```
FCM_INSTALLATION_STEPS.md       # Quick start installation (30 min)
FCM_SETUP_GUIDE.md              # Complete setup & usage guide
FCM_CREDENTIALS_TEMPLATE.md     # Where to paste your credentials
FCM_COMPARISON_TESTING.md       # FCM vs web-push testing methodology
FCM_ROLLBACK_INSTRUCTIONS.md    # How to safely remove FCM
FCM_README.md                   # This file
.env.fcm.example                # Environment variable template
```

**Total:** 11 new files, 0 modified files

## Safety Guarantees

### ✅ What Was NOT Changed

- ❌ **NO existing files modified**
- ❌ **NO web-push code touched**
- ❌ **NO existing functionality affected**
- ❌ **NO breaking changes**

### ✅ Existing Systems Untouched

| Component | Status | Location |
|-----------|--------|----------|
| `usePushNotifications` hook | ✅ Unchanged | `src/hooks/usePushNotifications.tsx` |
| `sw.js` service worker | ✅ Unchanged | `public/sw.js` |
| `push-notification-sender` function | ✅ Unchanged | `supabase/functions/push-notification-sender/` |
| `push_subscriptions` table | ✅ Unchanged | Database |

### ✅ Rollback Safety

- **Option 1:** Don't use FCM → Zero impact
- **Option 2:** Disable credentials → FCM inactive, web-push continues
- **Option 3:** Delete all files → Complete removal in 15 minutes

See: [FCM_ROLLBACK_INSTRUCTIONS.md](./FCM_ROLLBACK_INSTRUCTIONS.md)

## Quick Start (30 Minutes)

### Prerequisites

You need these Firebase credentials:
- **API Key:** `AIzaSyD...` (from Firebase Console)
- **App ID:** `1:242154179799:web:7c5b71cdcdeedac9277492`
- **Server Key:** `AAAA...` (from Cloud Messaging settings)

**Project:** my-detail-area
**Sender ID:** 242154179799

### Installation Steps

```bash
# 1. Install Firebase SDK
npm install firebase

# 2. Configure environment (.env.local)
# Add VITE_FIREBASE_* variables (see FCM_CREDENTIALS_TEMPLATE.md)

# 3. Update Service Worker credentials
# Edit public/firebase-messaging-sw.js with your API Key & App ID

# 4. Deploy database migration
supabase db push

# 5. Set Supabase secrets
supabase secrets set FCM_SERVER_KEY=YOUR_SERVER_KEY
supabase secrets set FCM_PROJECT_ID=my-detail-area

# 6. Deploy Edge Function
supabase functions deploy push-notification-fcm

# 7. Restart dev server
npm run dev
```

**Detailed instructions:** [FCM_INSTALLATION_STEPS.md](./FCM_INSTALLATION_STEPS.md)

## Usage Example

### Basic Implementation

```typescript
import { useFCMNotifications } from '@/hooks/useFCMNotifications';

function NotificationSettings() {
  const {
    isSupported,
    isConfigured,
    isSubscribed,
    subscribe,
    unsubscribe,
    testNotification,
  } = useFCMNotifications();

  if (!isSupported) {
    return <div>Push notifications not supported</div>;
  }

  if (!isConfigured) {
    return <div>Firebase not configured. Check environment variables.</div>;
  }

  return (
    <div>
      <h2>FCM Notifications</h2>
      <p>Status: {isSubscribed ? 'Enabled' : 'Disabled'}</p>

      {!isSubscribed ? (
        <button onClick={() => subscribe()}>
          Enable Notifications
        </button>
      ) : (
        <>
          <button onClick={() => unsubscribe()}>
            Disable Notifications
          </button>
          <button onClick={() => testNotification()}>
            Send Test
          </button>
        </>
      )}
    </div>
  );
}
```

### Sending Notifications (Backend)

```typescript
// From another Edge Function or service
const { data, error } = await supabase.functions.invoke('push-notification-fcm', {
  body: {
    userId: 'user-uuid',
    dealerId: 123,
    notification: {
      title: 'Vehicle Ready',
      body: 'Your vehicle service is complete',
    },
    data: {
      type: 'service_complete',
      orderId: 'order-uuid',
      url: '/orders/order-uuid',
    },
  },
});
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Frontend (React)                 │
│  useFCMNotifications Hook                │
│  ├─ Firebase SDK (getToken, onMessage)  │
│  ├─ Permission Management                │
│  └─ Token Storage                        │
└─────────────────────────────────────────┘
                  │
                  ▼ (FCM Token)
┌─────────────────────────────────────────┐
│       Database (Supabase)                │
│  fcm_tokens table                        │
│  ├─ user_id                              │
│  ├─ dealer_id                            │
│  ├─ fcm_token (string)                   │
│  └─ is_active                            │
└─────────────────────────────────────────┘
                  │
                  ▼ (Query tokens)
┌─────────────────────────────────────────┐
│    Edge Function (Deno)                  │
│  push-notification-fcm                   │
│  ├─ Fetch tokens from DB                 │
│  ├─ Call FCM HTTP API                    │
│  └─ Log results                          │
└─────────────────────────────────────────┘
                  │
                  ▼ (HTTPS POST)
┌─────────────────────────────────────────┐
│   Firebase Cloud Messaging               │
│  FCM API (fcm.googleapis.com)            │
│  ├─ Validate token                       │
│  ├─ Queue message                        │
│  └─ Deliver to device                    │
└─────────────────────────────────────────┘
                  │
                  ▼ (Push Event)
┌─────────────────────────────────────────┐
│    Service Worker                        │
│  firebase-messaging-sw.js                │
│  ├─ onBackgroundMessage                  │
│  ├─ showNotification                     │
│  └─ Handle clicks                        │
└─────────────────────────────────────────┘
```

## Testing Strategy

### Phase 1: Basic Functionality (Day 1)
- [ ] Configuration verification
- [ ] Token generation
- [ ] Notification sending
- [ ] Browser notification appearance
- [ ] Error handling

### Phase 2: Reliability Testing (Week 1)
- [ ] Success rate monitoring
- [ ] Edge Function logs analysis
- [ ] Browser compatibility testing
- [ ] Network condition testing
- [ ] Load testing

### Phase 3: Comparison (Week 2)
- [ ] FCM vs web-push side-by-side
- [ ] Reliability comparison
- [ ] Error rate comparison
- [ ] User experience comparison
- [ ] Decision on migration

**Testing guide:** [FCM_COMPARISON_TESTING.md](./FCM_COMPARISON_TESTING.md)

## Documentation Structure

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **FCM_README.md** (this) | Overview & quick reference | Start here |
| **FCM_INSTALLATION_STEPS.md** | Quick 30-min installation | First setup |
| **FCM_SETUP_GUIDE.md** | Complete setup & usage | Detailed implementation |
| **FCM_CREDENTIALS_TEMPLATE.md** | Where to paste credentials | During configuration |
| **FCM_COMPARISON_TESTING.md** | FCM vs web-push testing | During evaluation |
| **FCM_ROLLBACK_INSTRUCTIONS.md** | Safe removal process | If needed to rollback |
| **.env.fcm.example** | Environment template | Configuration reference |

## Key Differences: FCM vs web-push

| Feature | FCM (NEW) | web-push (EXISTING) |
|---------|-----------|---------------------|
| **Token Type** | Simple string | Complex subscription object |
| **Database Fields** | 1 field (`fcm_token`) | 3 fields (`endpoint`, `p256dh_key`, `auth_key`) |
| **Edge Function** | Native fetch API | npm library with issues |
| **Setup Complexity** | Medium | High |
| **Reliability** | Unknown (needs testing) | Known issues |
| **Error Messages** | Clear & specific | Opaque |
| **Token Cleanup** | Automatic | Manual |
| **Deno Compatibility** | ✅ Native | ⚠️ Compatibility issues |

## Configuration Requirements

### Frontend (.env.local)
```bash
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=my-detail-area.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-detail-area
VITE_FIREBASE_STORAGE_BUCKET=my-detail-area.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=242154179799
VITE_FIREBASE_APP_ID=1:242154179799:web:7c5b71cdcdeedac9277492
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX  # Optional
```

### Backend (Supabase Secrets)
```bash
FCM_SERVER_KEY=AAAA...  # From Firebase Console > Cloud Messaging
FCM_PROJECT_ID=my-detail-area
```

### Service Worker (firebase-messaging-sw.js)
```javascript
const firebaseConfig = {
  apiKey: 'AIzaSyD...',  // Same as VITE_FIREBASE_API_KEY
  authDomain: 'my-detail-area.firebaseapp.com',
  projectId: 'my-detail-area',
  storageBucket: 'my-detail-area.firebasestorage.app',
  messagingSenderId: '242154179799',
  appId: '1:242154179799:web:7c5b71cdcdeedac9277492',
};
```

## Database Schema

```sql
CREATE TABLE fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  dealer_id bigint NOT NULL REFERENCES dealerships(id),
  fcm_token text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, dealer_id, fcm_token)
);
```

**Indexes:**
- `idx_fcm_tokens_user_id`
- `idx_fcm_tokens_dealer_id`
- `idx_fcm_tokens_is_active`
- `idx_fcm_tokens_user_dealer`

**RLS Policies:**
- Users can manage their own tokens
- Service role can manage all tokens

## Security Considerations

### ✅ Safe for Frontend
- API Key (restricted by Firebase domain settings)
- App ID
- Project ID
- Sender ID

### ⚠️ Keep Secret (Backend Only)
- Server Key (NEVER expose in frontend)
- For production: Use OAuth2 with service account instead of legacy server key

### 🔒 Best Practices
- Store credentials in `.env.local` (git-ignored)
- Use Supabase secrets for server-side keys
- Configure Firebase authorized domains
- Enable Firebase App Check for production

## Troubleshooting

### "Firebase is not configured"
- Check `.env.local` has all variables
- No placeholder values like `YOUR_API_KEY`
- Restart dev server

### "Failed to get FCM token"
- Service Worker not registered
- Notification permission denied
- Firebase config mismatch

### "FCM_SERVER_KEY not configured"
- Set via: `supabase secrets set FCM_SERVER_KEY=...`
- Or via Supabase Dashboard → Edge Functions → Secrets

### Notification not appearing
- Check browser notification settings
- Check Service Worker console
- Check Edge Function logs in `edge_function_logs` table

**Full troubleshooting:** [FCM_SETUP_GUIDE.md](./FCM_SETUP_GUIDE.md#troubleshooting)

## Next Steps

### Immediate (Today)
1. ✅ Review this README
2. 📖 Read [FCM_CREDENTIALS_TEMPLATE.md](./FCM_CREDENTIALS_TEMPLATE.md)
3. 🔑 Gather Firebase credentials
4. ⚙️ Follow [FCM_INSTALLATION_STEPS.md](./FCM_INSTALLATION_STEPS.md)

### Short-term (This Week)
5. 🧪 Test basic functionality
6. 📊 Monitor logs and reliability
7. 🔄 Compare with web-push
8. 📝 Document findings

### Long-term (This Month)
9. 🎯 Decide on migration strategy
10. 📢 Communicate to team
11. 🚀 Plan gradual rollout (if successful)
12. 📚 Update documentation

## Support & Resources

### Internal Documentation
- [FCM_INSTALLATION_STEPS.md](./FCM_INSTALLATION_STEPS.md) - Quick installation
- [FCM_SETUP_GUIDE.md](./FCM_SETUP_GUIDE.md) - Complete guide
- [FCM_COMPARISON_TESTING.md](./FCM_COMPARISON_TESTING.md) - Testing methodology
- [FCM_ROLLBACK_INSTRUCTIONS.md](./FCM_ROLLBACK_INSTRUCTIONS.md) - Removal process

### External Resources
- [Firebase Documentation](https://firebase.google.com/docs/cloud-messaging)
- [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## File Summary

**Lines of Code:**
- Frontend TypeScript: ~450 lines
- Edge Function: ~280 lines
- Service Worker: ~90 lines
- Database Migration: ~80 lines
- Documentation: ~2,500 lines
- **Total:** ~3,400 lines

**Files Created:** 11 new files
**Files Modified:** 0 files
**Breaking Changes:** None

## Success Criteria

### Minimum Viable
- ✅ FCM token generation works
- ✅ Notifications appear in browser
- ✅ No errors in console
- ✅ Database stores tokens correctly

### Production Ready
- ✅ >90% notification delivery rate
- ✅ <5% error rate
- ✅ Clear error messages
- ✅ Automatic token cleanup
- ✅ Better than web-push reliability

### Migration Decision
- ✅ FCM more reliable than web-push
- ✅ Easier to debug and maintain
- ✅ User experience improved
- ✅ Team confident in FCM
- ✅ Migration plan documented

## Contact

**Questions?** Check documentation first:
1. [FCM_SETUP_GUIDE.md](./FCM_SETUP_GUIDE.md) for setup issues
2. [FCM_COMPARISON_TESTING.md](./FCM_COMPARISON_TESTING.md) for testing
3. [FCM_ROLLBACK_INSTRUCTIONS.md](./FCM_ROLLBACK_INSTRUCTIONS.md) for removal

---

**Implementation Date:** 2025-10-18
**Status:** ✅ Ready for Installation
**Approach:** Conservative & Reversible
**Impact on Existing Code:** ZERO

**Start Here:** [FCM_INSTALLATION_STEPS.md](./FCM_INSTALLATION_STEPS.md)
