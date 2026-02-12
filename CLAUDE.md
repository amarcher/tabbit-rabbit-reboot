# CLAUDE.md

## What is Tabbit Rabbit Reboot?

A modern bill-splitting web app. Users create tabs, add items with prices, assign items to people ("rabbits"), and split costs with tax and tip. Supports OCR receipt scanning via Claude vision and payment deep links (Venmo, Cash App, PayPal). Spiritual successor to the original `tabbit` (Rails) and `tabbit_rabbit` (Sinatra) apps.

## Development Commands

```bash
npm install          # Install dependencies
npm start            # Dev server on :3000
npm run build        # Production build
npm test             # Run tests
```

### Supabase

```bash
# CLI lives at ~/bin/supabase (direct binary download, not brew)
~/bin/supabase link --project-ref rqleufnowvqifigcbmwn
~/bin/supabase db push                    # Apply migrations
~/bin/supabase functions deploy parse-receipt --no-verify-jwt
~/bin/supabase secrets set KEY=value      # Set edge function secrets
```

Supabase project: `rqleufnowvqifigcbmwn`

## Tech Stack

- **Frontend**: React 19, TypeScript, CRA, Bootstrap 5, react-bootstrap, react-router-dom v7
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions, Realtime)
- **Receipt OCR**: Supabase Edge Function calling Claude Haiku 4.5 vision API (ANTHROPIC_API_KEY stored as Supabase secret)

## Architecture

### Database Schema (Supabase Postgres)

```
profiles        — extends auth.users (username, display_name, venmo/cashapp/paypal usernames)
tabs            — bill/receipt to split (name, owner_id, tax_percent, tip_percent)
rabbits         — people on a tab (name, color, optional profile_id link)
items           — line items (description, price_cents)
item_rabbits    — many-to-many assignments (item_id, rabbit_id)
```

RLS is enabled on all tables. Cross-table RLS policies use `security definer` helper functions (`is_tab_owner`, `is_tab_rabbit`, `get_tab_id_for_item`) to avoid infinite recursion (see migration 004).

A DB trigger (`handle_new_user`) auto-creates a profile row on auth signup (migration 002).

### Frontend Structure

```
src/
  components/
    Layout.tsx          — Navbar + sticky footer wrapper
    NavBar.tsx          — Dark navbar with brand icon
    LoginForm.tsx       — Supabase auth login
    SignupForm.tsx      — Supabase auth registration
    TabList.tsx         — Dashboard: tab list + create form
    TabEditor.tsx       — Main tab editing view (items, rabbits, totals inline)
    ItemList.tsx        — List of items with inline add form
    ItemRow.tsx         — Single item with rabbit-color gradient background
    RabbitBar.tsx       — Row of color-coded rabbit buttons with subtotals
    AddRabbitModal.tsx  — Modal to add a new rabbit with auto color assignment
    TotalsView.tsx      — Inline: tax/tip controls, per-rabbit breakdown, grand total
    PaymentLinks.tsx    — Venmo/CashApp/PayPal deep link buttons per rabbit
    ReceiptUpload.tsx   — Camera/file upload → edge function → parsed items
  hooks/
    useAuth.ts          — Supabase auth state, signIn/signUp/signOut, profile
    useTab.ts           — Local-first tab editing with pending changes + auto-save
    useRealtime.ts      — Supabase realtime subscriptions for live collaboration
  pages/
    Dashboard.tsx       — Thin wrapper around TabList
    TabPage.tsx         — Thin wrapper around TabEditor
  types/index.ts        — TypeScript interfaces (Profile, Tab, Item, Rabbit, ItemRabbit, RabbitColor)
  utils/
    currency.ts         — formatCents(), parseDollars()
    gradients.ts        — CSS linear-gradient from rabbit color arrays
    payments.ts         — venmoLink(), cashAppLink(), paypalLink() URL generators
  supabaseClient.ts     — Supabase client singleton
```

### Key Patterns

**Local-first editing** (`useTab.ts`): All mutations (add/delete items, add/remove rabbits, toggle assignments, update tab) apply instantly to local state. Changes queue in a `PendingChanges` ref and flush to Supabase after 2 minutes of inactivity or on manual save. Uses `crypto.randomUUID()` for client-side ID generation. `beforeunload` warning prevents losing unsaved work.

**Multi-rabbit gradient backgrounds**: Items assigned to multiple rabbits show a CSS `linear-gradient` using each rabbit's Bootstrap color hex. This is the app's signature visual feature.

**Receipt OCR flow**: Upload image → Supabase Storage → Edge Function fetches image, sends base64 to Claude Haiku 4.5 → returns structured JSON (items, subtotal, tax, total) → batch-inserted locally via `addItems()`, tax auto-inferred.

## Environment Variables

`.env.local` (not committed):
```
REACT_APP_SUPABASE_URL=https://rqleufnowvqifigcbmwn.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon key>
```

Supabase secrets (set via CLI):
```
ANTHROPIC_API_KEY=<key for receipt OCR edge function>
```

## Routes

| Path | Component | Auth |
|------|-----------|------|
| `/` | Dashboard | Required |
| `/login` | LoginForm | Guest only |
| `/signup` | SignupForm | Guest only |
| `/tabs/:tabId` | TabEditor | Required |

## What's Done

- [x] Project scaffold (CRA + TypeScript + Bootstrap 5)
- [x] Supabase schema, RLS, auth trigger, recursion fix (migrations 001-004)
- [x] Auth flow (login, signup, signout)
- [x] Dashboard (tab list, create, delete)
- [x] Tab editor with inline item/rabbit/totals editing
- [x] Multi-rabbit gradient color system
- [x] Local-first optimistic editing with debounced auto-save
- [x] Receipt OCR via Claude Haiku 4.5 edge function
- [x] Batch item import from receipts with tax inference
- [x] Payment deep links (Venmo, CashApp, PayPal) in totals breakdown
- [x] Realtime subscriptions for collaborative editing
- [x] Tax/tip controls with per-rabbit totals

## What's Not Done

- [ ] **Profile settings page** — no UI to set venmo_username, cashapp_cashtag, paypal_username (DB fields exist, no form)
- [ ] **Rabbit-to-profile linking** — rabbits are created with `profile_id: null`, no way to link to an existing user's profile
- [ ] **Tab sharing** — no shareable links for others to view a tab and see what they owe
- [ ] **Mobile app** — Expo/React Native companion app (planned, not started)
- [ ] **Deployment** — AWS Amplify or Vercel for web hosting

## Code Style

- TypeScript strict mode via CRA defaults
- Functional components with hooks only
- Supabase query builders need `.then()` to become `PromiseLike` for `Promise.all`
- Use `Array.from()` instead of spread on `Set` (ES5 target)
