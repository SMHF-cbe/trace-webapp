# TRACE Frontend — iPhone-first web build

This project is the web-deployable edition of the public Expo frontend at [SMHF-cbe/TRACE_frontend](https://github.com/SMHF-cbe/TRACE_frontend), based on source commit `c1c4da68afb0a8a5650b8300f2b23f158b601d6`. The existing React Native screens, navigation, styles, assets, and app flows have been retained. Web-specific additions are limited to static export and hosting configuration, browser-safe API defaults, iPhone Safari viewport/safe-area handling, working browser alerts, and Safari-native date inputs. The native date-picker and screen flows remain in the project.

The interface is intended primarily for iPhone Safari and portrait mobile use. On wider screens, the app remains in a phone-sized column rather than stretching into a desktop dashboard.

## Run locally

Use Node.js 20 or newer and npm:

```bash
npm ci
cp .env.example .env
```

Edit `.env` and set `EXPO_PUBLIC_API_URL` to the base URL of your deployed TRACE API. For a physical iPhone, use an API URL reachable from the device; do not use `localhost`. Restart Expo after changing `.env`.

```bash
npm run web
```

## Build and deploy

Set `EXPO_PUBLIC_API_URL` to the public HTTPS origin of the API before building. This is a browser-visible configuration value, not a secret. The API must allow CORS requests from the website's deployed origin.

```bash
npm ci
npm run build
```

Expo writes the production website to `dist/`. The ZIP includes this generated output as well as the source. `netlify.toml` and the public `_redirects` file configure a Netlify/Cloudflare Pages build and extensionless route handling. `vercel.json` configures the corresponding Vercel static build and route rewrites. For other static hosts, build with the same command and publish `dist/`; if the provider requires it, configure the extensionless routes to the matching `.html` files and use `index.html` as the fallback.

For a shell-based build, you can provide the variable inline:

```bash
EXPO_PUBLIC_API_URL=https://api.example.com npm run build
```

For Netlify or Vercel, set `EXPO_PUBLIC_API_URL` in the provider's build environment before deploying.

## Backend dependency

This repository contains the frontend only. It calls a separate TRACE API for route, store, report, login, and admin data; that API is not included in this ZIP and must be deployed separately. Without a valid `EXPO_PUBLIC_API_URL`, the static pages can load but API-backed app flows will not connect. The iPhone Safari browser also requires the API to use HTTPS when the website is served over HTTPS. Location access requires a secure context and the user's permission.

**Dependency compatibility and audit note:** Expo SDK 54's `expo install --check` reports package-version differences, including `expo-location` pinned at `^55.1.7` while SDK 54 expects `~19.0.8`. The web export and TypeScript check passed with the source versions, which were preserved for parity; validate/resolve these mismatches before native APK/iOS builds or production deployment. The copied upstream lockfile also reports 50 advisories in `npm audit --omit=dev` (2 critical, 16 high, 30 moderate, and 2 low); review and update dependencies before public production deployment.

## iPhone Safari notes

The web document includes `viewport-fit=cover` and iOS web-app metadata for safe-area-aware rendering. Native screens continue to use the original React Native safe-area wrapper. Form controls retain a minimum 16px font size to avoid Safari's automatic input zoom. The app's existing alerts are mapped to Safari browser dialogs, and its web-only date field uses the browser's native date control. The page is constrained to a phone-width canvas on larger screens.

## Project structure

- `app/` — Expo Router screens, the original route/tab navigation, and the web HTML document.
- `components/` — shared UI plus browser-only date and alert compatibility.
- `context/`, `constants/` — session/auth state, styling, and API configuration.
- `assets/` — source app icons and image assets.
- `public/manus-routes.json` — page route inventory for web tooling.
- `public/_redirects`, `netlify.toml`, `vercel.json` — static host route and build configuration.
- `dist/` — generated static website output.
