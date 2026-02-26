# Tabbit Rabbit

A bill-splitting app for web, iOS, and Android. Create tabs, add items with prices, assign them to people ("rabbits"), and split costs with tax and tip. Supports AI-powered receipt scanning and payment deep links for Venmo, Cash App, and PayPal.

**Live at [tabbitrabbit.com](https://tabbitrabbit.com)**

## Features

- **Split bills easily** — add items, assign them to rabbits, and auto-calculate each person's share with tax and tip
- **Receipt scanning** — snap a photo of a receipt and let Claude AI extract items and prices automatically
- **Multi-rabbit items** — items shared between multiple people show a gradient of each person's color
- **Payment links** — send Venmo charge requests, Cash App links, or PayPal links directly from the app
- **Bill sharing** — share a tab via link so others can see what they owe
- **Fully local-first** — all data lives on your device, no account required
- **iOS & Android apps** — native experience with swipe-to-delete, haptics, and deep links

## Tech Stack

| Layer | Technology |
|-------|------------|
| Web | React 19, TypeScript, Bootstrap 5, react-bootstrap |
| Mobile | Expo SDK 54, React Native, expo-router |
| Backend | Vercel serverless functions, Vercel KV (Upstash Redis) |
| Receipt OCR | Claude Haiku 4.5 vision API |
| Deployment | Web on Vercel, mobile via EAS Build (TestFlight / Google Play) |

## Project Structure

```
├── src/                  # Web app (React + TypeScript)
│   ├── components/       # UI components (TabEditor, ItemList, PaymentLinks, etc.)
│   ├── pages/            # Route pages (Dashboard, TabPage, SharedBillPage)
│   ├── hooks/            # useTab, useAuth, useSharedTab
│   ├── utils/            # payments, billEncoder, scanCounter, anthropic
│   ├── types/            # TypeScript types
│   └── styles/           # CSS + gradients
├── mobile/               # Mobile app (Expo + React Native, iOS & Android)
│   ├── app/              # File-based routing (expo-router)
│   ├── src/              # Hooks, utils, types (mirrors web)
│   └── components/       # Native UI components
├── api/                  # Vercel serverless functions
│   ├── share.js          # POST — store bill in KV, return share token
│   ├── bill/[token].js   # GET — fetch shared bill by token
│   ├── parse-receipt.js  # POST — server-side receipt OCR proxy
│   ├── bill-og.js        # GET — OG meta tags for social link previews
│   ├── bill-image.tsx    # GET — dynamic OG image generation
│   └── aasa.js           # GET — Apple App Site Association for deep links
└── public/               # Static assets
```

## Getting Started

### Web App

```bash
npm install
npm start            # Dev server on http://localhost:3000
npm run build        # Production build
npm test             # Run tests
```

### Mobile App

```bash
cd mobile
npm install
npm start            # Expo dev server
npm run ios          # iOS simulator
npm run android      # Android emulator
```

### Environment Variables

Create a `.env.local` in the root for the web app:

```
ANTHROPIC_API_KEY=<key>             # Server-side receipt OCR
KV_REST_API_URL=<url>               # Vercel KV (Upstash Redis)
KV_REST_API_TOKEN=<token>           # Vercel KV auth
KV_REST_API_READ_ONLY_TOKEN=<token>
```

## Architecture

### Local-First

All tab data lives on-device — `localStorage` on web, `AsyncStorage` on mobile. There is no backend database for user tabs and no account/login required. Profiles are stored locally.

The only server-side components are:
- **Vercel KV** — stores shared bills (90-day TTL) when a user shares a tab
- **Vercel serverless functions** — bill sharing API, receipt OCR proxy, OG image generation

### Receipt OCR (Dual Path)

1. **BYOK** — bring your own Anthropic API key for unlimited direct client-side scanning
2. **Free** — 10 scans/month via the Vercel serverless proxy (tracked locally)

### Bill Sharing

`shareBill()` posts bill data to `/api/share`, which stores it in Vercel KV with a 90-day TTL and returns a 6-character token. Shared bills are viewable at `tabbitrabbit.com/bill/{token}`. On mobile, deep links open shared bills directly in the app.

## License

Private — all rights reserved.
