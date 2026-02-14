# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Tabbit Rabbit?

A bill-splitting app (web + iOS). Users create tabs, add items with prices, assign items to people ("rabbits"), and split costs with tax and tip. Supports OCR receipt scanning via Claude vision and payment deep links (Venmo, Cash App, PayPal).

## Development Commands

### Web App (root directory)
```bash
npm install          # Install dependencies
npm start            # Dev server on :3000
npm run build        # Production build
npm test             # Run tests
```

### Mobile App (mobile/ directory)
```bash
npm start            # Expo dev server
npm run ios          # iOS simulator
npx expo install <pkg>  # Install Expo-compatible packages (always use this, not npm install)
npx tsc --noEmit     # TypeScript check (no build step — EAS builds natively)
```

### EAS Build & Deploy (mobile/ directory)
```bash
npx eas build --platform ios --profile production   # Build for TestFlight
npx eas submit --platform ios                       # Submit to App Store
npx eas build:list --platform ios --limit 1 --json --non-interactive  # Check build status
```

### Supabase
```bash
# CLI lives at ~/bin/supabase (direct binary, not brew)
~/bin/supabase link --project-ref rqleufnowvqifigcbmwn
~/bin/supabase db push                    # Apply migrations
~/bin/supabase functions deploy parse-receipt --no-verify-jwt
~/bin/supabase secrets set KEY=value      # Set edge function secrets
```

Supabase project ref: `rqleufnowvqifigcbmwn`

## Tech Stack

- **Web**: React 19, TypeScript, CRA, Bootstrap 5, react-bootstrap, react-router-dom v7
- **Mobile**: Expo SDK 54, React Native, expo-router (file-based routing), TypeScript
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions, Realtime)
- **Auth**: Google OAuth (web uses `signInWithOAuth`, mobile uses `expo-auth-session` + `signInWithIdToken`)
- **Receipt OCR**: Supabase Edge Function calling Claude Haiku 4.5 vision API
- **Deployment**: Web on Vercel, mobile via EAS Build → TestFlight

## Architecture

### Database Schema (Supabase Postgres)

```
profiles        — extends auth.users (display_name, venmo/cashapp/paypal usernames)
tabs            — bill to split (name, owner_id, tax_percent, tip_percent, share_token)
rabbits         — people on a tab (name, color, optional profile_id)
items           — line items (description, price_cents)
item_rabbits    — many-to-many assignments (item_id, rabbit_id)
```

RLS on all tables. Cross-table policies use `security definer` helper functions (`is_tab_owner`, `is_tab_rabbit`, `get_tab_id_for_item`) to avoid infinite recursion (migration 004). Shared bill access uses `get_shared_tab()` RPC (migration 005).

### Two-Project Structure

Web (`src/`) and mobile (`mobile/src/`) share the same architecture but are independent copies adapted per platform:
- **types, currency, payments** — nearly identical
- **useTab.ts** — same local-first pattern; web uses `crypto.randomUUID()`, mobile uses `expo-crypto`
- **useAuth.ts** — web uses Supabase OAuth redirect, mobile uses expo-auth-session ID token flow
- **colors** — web has `gradients.ts` (CSS linear-gradient strings), mobile has `colors.ts` (hex arrays for `expo-linear-gradient`)
- **useBillCache.ts** — mobile-only, caches shared bills in AsyncStorage for offline access

### Key Patterns

**Local-first editing** (`useTab.ts`): All mutations apply instantly to local state. Changes queue in a `PendingChanges` ref and flush to Supabase after 2 min inactivity or manual save. Client-side UUID generation for new entities.

**Multi-rabbit gradients**: Items assigned to multiple rabbits show a gradient using each rabbit's color. This is the app's signature visual feature.

**Receipt OCR flow**: Upload image → Supabase Storage → Edge Function sends base64 to Claude Haiku 4.5 → structured JSON (items, subtotal, tax, total) → batch-inserted locally, tax auto-inferred.

**Swipe-to-delete** (mobile): Items and tabs use `react-native-gesture-handler` `Swipeable` with Delete/Cancel actions instead of delete buttons.

**Deep linking**: iOS Universal Links intercept `tabbitrabbit.com/bill/*` via AASA file (`public/.well-known/apple-app-site-association`). expo-router maps these to `app/bill/[shareToken].tsx`.

## Environment Variables

**Web** (`.env.local`, not committed):
```
REACT_APP_SUPABASE_URL=https://rqleufnowvqifigcbmwn.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon key>
```

**Mobile** (`mobile/.env`, not committed):
```
EXPO_PUBLIC_SUPABASE_URL=https://rqleufnowvqifigcbmwn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<iOS OAuth client ID>
```

**Supabase secrets** (set via CLI): `ANTHROPIC_API_KEY`

## Gotchas

- **Hermes + crypto**: React Native's Hermes engine lacks `crypto.getRandomValues()`. Use `expo-crypto` (`Crypto.randomUUID()`) instead of the `uuid` package.
- **Base64 in Deno edge functions**: Never use `String.fromCharCode(...new Uint8Array(buf))` — the spread overflows the call stack on large files. Use a loop instead.
- **Supabase queries in `Promise.all`**: Query builders aren't `PromiseLike` — append `.then()` to make them work with `Promise.all`.
- **expo-linear-gradient colors**: Requires tuple type `[string, string, ...string[]]`, not `string[]`.
- **Google OAuth (mobile)**: Requires the reversed client ID as a URL scheme in `app.json` `CFBundleURLTypes`. Supabase dashboard must have the iOS client ID in the authorized client IDs list with "Skip nonce checks" enabled.
- **AASA file**: Vercel's SPA rewrite can swallow `/.well-known/*` paths — needs an explicit passthrough rewrite in `vercel.json`.
- **EAS build env vars**: Set via `eas secret:create` or Expo dashboard, not via `.env` file (which is local-only).

## iOS App Details

- Bundle ID: `com.tabbitrabbit.app`
- Apple Team ID: `J39B2498YF`
- EAS Project ID: `e9b76fea-509b-4fde-a602-129ffde73b8c`
- EAS Owner: `aarcher`
- Custom URL scheme: `tabbitrabbit`
- Associated domain: `applinks:tabbitrabbit.com`
