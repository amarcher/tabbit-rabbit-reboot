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

### Dev Client Testing (mobile/ directory)
```bash
npx eas build --profile development --platform ios  # Build dev client (needed after native dep changes)
REACT_NATIVE_PACKAGER_HOSTNAME=<LAN_IP> npx expo start --dev-client  # Start bundler for physical device
```
New native build required when adding packages with native modules (e.g., `react-native-svg`, `@react-native-community/slider`). JS-only changes hot-reload without a new build. No test suite exists for mobile.

### EAS Build & Deploy (mobile/ directory)
```bash
npx eas build --platform ios --profile production   # Build for TestFlight
npx eas submit --platform ios                       # Submit to App Store
npx eas build:list --platform ios --limit 1 --json --non-interactive  # Check build status
```

## Tech Stack

- **Web**: React 19, TypeScript, CRA, Bootstrap 5, react-bootstrap, react-router-dom v7
- **Mobile**: Expo SDK 54, React Native, expo-router (file-based routing), TypeScript, react-native-reanimated, Nunito + DM Sans fonts
- **Backend**: Vercel serverless functions + Vercel KV (Upstash Redis)
- **Auth**: None — local profiles stored in localStorage (web) / AsyncStorage (mobile)
- **Receipt OCR**: Claude Haiku 4.5 vision API (BYOK direct or free via Vercel serverless)
- **Deployment**: Web on Vercel, mobile via EAS Build → TestFlight

## Architecture

### Fully Local-First

All tab data lives on-device. There is **no backend database** for user tabs — no Supabase, no server sync. Web uses `localStorage`, mobile uses `AsyncStorage`. Profiles are also local-only (no sign-in required).

The only server-side components are:
- **Vercel KV** — stores shared bills (90-day TTL) when users share a tab
- **Vercel serverless functions** — bill sharing API, receipt OCR proxy, OG image generation

### Vercel API Routes (`api/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/share` | POST | Store bill in Vercel KV, return 6-char token |
| `/api/bill/[token]` | GET | Fetch shared bill from KV (1hr cache header) |
| `/api/parse-receipt` | POST | Server-side receipt OCR (Claude Haiku 4.5) |
| `/api/bill-og` | GET | OG meta tags for social media crawlers |
| `/api/bill-image` | GET | Dynamic OG image (React → PNG via `@vercel/og`) |
| `/api/aasa` | GET | Apple App Site Association for deep links |

Shared helper: `api/_lib/getBill.js` — reads bill from KV by token, used by `bill/[token]`, `bill-og`, and `bill-image`.

Social crawlers (Facebook, Twitter, WhatsApp, Slack, Discord, Telegram) hitting `/bill/*` are routed to `/api/bill-og` via user-agent matching in `vercel.json`.

### Two-Project Structure

Web (`src/`) and mobile (`mobile/src/`) share the same architecture but are independent copies adapted per platform:
- **types, currency** — nearly identical
- **payments** — same helpers (`venmoLink`, `cashAppLink`, `paypalLink`, `venmoChargeLink`, `buildPaymentNote`, `buildChargeNote`) but web uses `isMobile()` UA detection to choose `venmo://` vs `https://venmo.com`; mobile always uses `venmo://paycharge`
- **useTab.ts** — same local-first pattern; web uses `crypto.randomUUID()`, mobile uses `expo-crypto`
- **useAuth.ts** — both use local storage only (localStorage / AsyncStorage), no OAuth
- **anthropic.ts** — BYOK API key storage differs: web uses `localStorage`, mobile uses `expo-secure-store`
- **billEncoder.ts** — LZ-string compression for legacy bill URLs + `shareBill()` POST to `/api/share`
- **scanCounter.ts** — monthly free scan tracking (10/month)
- **colors** — web has `gradients.ts` (CSS linear-gradient strings), mobile has `colors.ts` (hex arrays for `expo-linear-gradient`)
- **theme.ts** — mobile has a centralized design token file (`mobile/src/utils/theme.ts`) exporting `colors`, `fonts`, `shadow*`, `spacing`, `radii`, `timing`. All 16+ mobile files import from this.
- **useBillCache.ts** — mobile-only, caches shared bills in AsyncStorage for offline access

### Key Patterns

**Local-first editing** (`useTab.ts`): All mutations apply instantly to local state and persist to storage (localStorage / AsyncStorage) on every change via `useEffect`. Client-side UUID generation for new entities. No backend sync — tabs exist only on the device that created them.

**Receipt OCR** (dual-path):
1. **BYOK**: User provides their own Anthropic API key → direct client-side call to Claude Haiku 4.5 (no scan limit). Web uses `anthropic-dangerous-direct-browser-access` header; mobile stores key in `expo-secure-store`.
2. **Free**: POST to `https://tabbitrabbit.com/api/parse-receipt` → Vercel serverless → Anthropic API (10 free scans/month, tracked locally by `scanCounter.ts`).

Receipt scanning logic lives inline in `mobile/app/tab/[tabId].tsx` (mobile) and `src/components/TabEditor.tsx` (web).

**Bill sharing**: `shareBill()` POSTs full bill data to `/api/share` → stored in Vercel KV with 90-day TTL → returns 6-char base64 token. `useSharedTab()` fetches by token from `/api/bill/{token}`. Legacy LZ-string compressed tokens still supported via client-side decode.

**Multi-rabbit gradients**: Items assigned to multiple rabbits show a gradient using each rabbit's color. This is the app's signature visual feature.

**Venmo charge requests**: Tab owners can send Venmo charge requests to rabbits. Uses `venmoChargeLink()` which builds a `venmo://paycharge?txn=charge` URL (mobile) or `https://venmo.com/?txn=charge` URL (web desktop). `buildChargeNote()` produces a multiline note with item breakdown.

**Swipe-to-delete** (mobile): Items and tabs use `react-native-gesture-handler` `Swipeable` with Delete/Cancel actions instead of delete buttons.

**Deep linking**: iOS Universal Links intercept `tabbitrabbit.com/bill/*` via AASA file (served by `/api/aasa`). expo-router maps these to `app/bill/[shareToken].tsx`.

**NUX onboarding** (mobile): Uses `@edwardloopez/react-native-coachmark` with two tours defined in `mobile/src/utils/onboardingTour.ts`:
- `homeTour` — single step on the home screen for new users (no tabs)
- `editorTour` — 3 steps on the tab editor (scan, add people, assign)
Both use `showOnce: true` and persist completion state via AsyncStorage. CoachmarkAnchors must only wrap components that are **always mounted** — wrapping conditionally-rendered components causes crashes when anchors appear/disappear mid-tour. The editor tour calls `stop()` on unmount to prevent the overlay from animating toward unmounted anchors.

**Toast notifications** (mobile): `ToastProvider` in root layout provides `useToast()` hook with `showToast(message, type)`. Replaces blocking `Alert.alert` for success/info feedback. Animated slide-in with progress bar countdown.

**AnimatedNumber** (mobile): Smoothly animates between currency values using react-native-reanimated. Applied to all currency displays in TotalsView and SharedBillPage. Formatting must happen on the JS thread via `runOnJS` — never call `.toFixed()` or other JS methods directly inside a reanimated worklet.

**Confetti burst** (mobile): 36-particle spring animation on successful bill share. Renders as an absolute overlay sibling to the ScrollView.

**Skeleton loading** (mobile): `TabListSkeleton` replaces `ActivityIndicator` on the home screen during initial load. Uses a breathing opacity animation.

**Tax/tip sliders** (mobile): `@react-native-community/slider` with companion TextInput for manual entry. Separate string state (`taxInputText`/`tipInputText`) prevents the trailing-dot input issue.

**patch-package**: Used to patch `@edwardloopez/react-native-coachmark` (hide step dots on single-step tours). Patch file at `mobile/patches/`. `postinstall` script in package.json runs `npx patch-package` to re-apply on every install including EAS builds.

## Environment Variables

**Web** (`.env.local`, not committed):
```
ANTHROPIC_API_KEY=<key>           # Server-side receipt OCR
KV_REST_API_URL=<url>             # Vercel KV (Upstash Redis)
KV_REST_API_TOKEN=<token>         # Vercel KV write token
KV_REST_API_READ_ONLY_TOKEN=<token>
```

**Vercel deployment**: Same vars set in Vercel dashboard (auto-injected for serverless functions).

**Mobile** (`mobile/.env`, not committed): No env vars are actively used in app code. The Supabase vars in `.env` are vestigial.

## Gotchas

- **Hermes + crypto**: React Native's Hermes engine lacks `crypto.getRandomValues()`. Use `expo-crypto` (`Crypto.randomUUID()`) instead of the `uuid` package.
- **expo-linear-gradient colors**: Requires tuple type `[string, string, ...string[]]`, not `string[]`.
- **AASA file**: Vercel's SPA rewrite can swallow `/.well-known/*` paths — needs an explicit route in `vercel.json` pointing to `/api/aasa`.
- **EAS build env vars**: Set via `eas secret:create` or Expo dashboard, not via `.env` file (which is local-only).
- **Venmo deep link encoding**: Venmo's web URL handler decodes query params as form-urlencoded, rendering spaces as "+" in notes. Use `venmo://paycharge` deep links on mobile to encode notes correctly. Web uses `isMobile()` UA detection to choose the right scheme.
- **React Native decimal inputs**: `parseFloat("10.")` strips the trailing dot, so `value={String(num)}` round-trips lose it. Use separate string state for raw input while editing; parse to number only on blur.
- **Keyboard occlusion**: Add `automaticallyAdjustKeyboardInsets` to `ScrollView` components containing `TextInput` fields so they scroll above the virtual keyboard when focused.
- **Anthropic vision API**: Only accepts image/jpeg, image/png, image/gif, image/webp — normalize other content types to jpeg.
- **Browser CORS for Anthropic**: Web BYOK requires `anthropic-dangerous-direct-browser-access: true` header.
- **Reanimated worklets**: Functions called inside `useAnimatedReaction` or worklet callbacks run on the UI thread with a limited JS runtime. Never call `.toFixed()`, `JSON.stringify()`, or other complex JS methods directly in worklets — use `runOnJS(handler)(value)` to move formatting to the JS thread.
- **Coachmark anchor lifecycle**: `CoachmarkAnchor` components must wrap always-mounted views. Wrapping conditionally-rendered components (e.g., inside `{hasItems && ...}`) crashes the coachmark overlay when those components mount/unmount mid-tour. Tours should call `stop()` on screen unmount.
- **fontWeight vs fontFamily**: React Native custom Google Fonts bake weight into the variant name (e.g., `Nunito_700Bold`). Setting both `fontFamily` and `fontWeight` causes conflicts — always remove `fontWeight` when using a named font variant.
- **patch-package**: Used for small library fixes. Patch files in `mobile/patches/` are auto-applied via `postinstall` script. Always commit patch files to the repo.

## Legacy: Supabase

The `supabase/` directory contains migrations and an edge function (`parse-receipt`) from a previous architecture that used Supabase for auth, storage, and database. **Supabase is no longer used by app code** — no imports of `@supabase/supabase-js` exist in `src/` or `mobile/`. The Supabase project ref is `rqleufnowvqifigcbmwn` and the CLI lives at `~/bin/supabase` if migrations ever need to be managed.

## iOS App Details

- Bundle ID: `com.tabbitrabbit.app`
- Apple Team ID: `J39B2498YF`
- EAS Project ID: `e9b76fea-509b-4fde-a602-129ffde73b8c`
- EAS Owner: `aarcher`
- Custom URL scheme: `tabbitrabbit`
- Associated domain: `applinks:tabbitrabbit.com`
