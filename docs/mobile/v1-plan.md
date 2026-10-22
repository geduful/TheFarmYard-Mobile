# TheFarmYard Mobile — v1 Build Plan

**Status:** approved direction, pre-implementation
**Decisions:** Expo / React Native · Android-first · farmer + buyer · owner implements, agent reviews
**Target:** core commerce loop (discover → list → escrow → deliver → confirm) plus push and traceability scan

> **Payments: deferred by owner.** M4 is built and tested against demo mode (no `FLW_SECRET_KEY`). This blocks release, not development — the escrow state machine is fully exercisable without a live gateway.

---

## 1. Locked decisions

| Decision | Choice | Reason |
|---|---|---|
| Framework | Expo (managed, EAS Build) | Camera, QR, push, offline primitives. No native code needed for v1. |
| Navigation | Expo Router | File-based, deep links map to routes, same mental model as Next App Router. |
| Auth transport | `@supabase/supabase-js` + SecureStore, PKCE | `@supabase/ssr` is cookie-only and cannot work in RN. |
| Server state | TanStack Query v5 | Retry, cache persistence, AppState/NetInfo-driven refetch. |
| Styling | Design tokens + `StyleSheet` | Tailwind v4 → NativeWind has fragile RN compatibility. Don't couple the build to it. |
| Backend | Existing Next.js API routes + direct Supabase | No rewrite. Bearer auth added only to routes mobile actually calls. |
| Platforms | Android first, iOS after retention data | Play Console + EAS internal track is a 3-day path; Apple review is not. |

**Deliberately not in v1:** procurement, offtake, storage, funding, supplies, quality, learning, news, admin, provider, offline write queue, iOS.

---

## 2. Blockers to clear before M4 (payments)

These are business/infrastructure items, not code. They gate the release, not the build.

1. **Flutterwave live keys.** `FLW_SECRET_KEY`, `FLW_WEBHOOK_HASH` in Vercel production. Until then the app cannot take money and must not ship.
2. **`APP_URL`** set in production (currently defaults to `request.nextUrl.origin`, which is fine, but be explicit).
3. **`SUPABASE_SERVICE_ROLE_KEY`** in production — `/api/escrow/callback` throws without it, so *every* real payment fails verification.
4. **Flutterwave webhook** pointed at `https://<domain>/api/flutterwave/webhook` and verified live.
5. **Play Console account** ($25) + package name reserved.
6. **EAS account** — needed from day one because Expo Go no longer supports Android remote push.

Known defect, unrelated to mobile: the 4-digit password reset in `forgot-password/page.tsx` inserts into `password_reset_codes`, but migration `00018` removed the INSERT policy. That path fails 100% of the time. Mobile should use Supabase email OTP instead.

---

## 3. Repo layout

Two repos, separate roots. No workspaces, no shared build:

```
C:\TheFarmYard-Mobile\                          # new Expo app
C:\Users\Kobby\OneDrive\Desktop\CODES\TheFarmYard\   # existing Next.js app — untouched
```

Do not nest the Expo app inside the web repo, and do not convert the web repo into a workspace. In order of how much it will hurt if ignored:

1. **Metro watches the project root.** Pointed at a directory containing the web app's `node_modules` and `.next`, it indexes hundreds of thousands of files on cold start. On Windows that is slow at best and `EMFILE`/`EBUSY` at worst. It is the most common way people lose a day setting up React Native on Windows.
2. **The web repo lives under OneDrive.** Adding a second watcher and build cache to a synced directory multiplies lock contention. Put the mobile repo somewhere OneDrive isn't watching — `C:\TheFarmYard-Mobile`, not `Desktop\CODES\...`.
3. **They share less than it looks.** The contract between the two apps is the Postgres schema and the `/api` surface. Both are external interfaces. A `packages/shared` would have bought a types import and one static constants file — not worth restructuring a live app for.

### What is shared, and how

| Shared thing | Mechanism |
|---|---|
| DB schema | `supabase gen types typescript` against the linked project, output committed in **both** repos |
| `/api` contract | `docs/mobile/api-contract.md` in the web repo; changes additive |
| `GHANA_LOCATIONS` | Copy the single file. Static government data; changes when districts are redrawn, not on a sprint cadence |

### Setup

Scaffolded with the SDK 58 default template, then moved back to **SDK 57**: the target iPhone's Expo Go is 57, Expo Go runs exactly one SDK at a time, and rebuilding Expo Go for 58 requires a paid Apple Developer account. Revisit when the App Store build catches up. One housekeeping step before code:

```bash
npm run reset-project    # answer "n" — deletes the demo screens
```

The demo code is in the template's public repo if you ever want to reference it; leaving `example/` in the tree just invites accidental imports.

Two facts about this template that contradict most tutorials:

- Routes live in **`src/app/`**, not `app/`.
- `@/*` maps to `./src/*`, `@/assets/*` to `./assets/*`.

`app.json` — the template ships `"scheme": "thefarmyardmobile"` and no Android package. Change to:

```jsonc
{
  "expo": {
    "name": "TheFarmYard",
    "slug": "thefarmyard",
    "scheme": "thefarmyard",
    "android": {
      "package": "africa.thefarmyard.app",
      "versionCode": 1
    }
  }
}
```

EAS refuses to build without `android.package`.

### Tab architecture

`NativeTabs` from `expo-router/unstable-native-tabs` — stable API, but SDK 57 still keeps it behind the `unstable-` subpath (SDK 58 promotes it to `expo-router/native-tabs`). Renders a real native tab bar on both platforms. Use the `md` prop with Material Symbol names on Android; don't ship per-tab PNGs.

```
src/app/
  _layout.tsx             Stack: (auth) | (tabs) | full-screen details
  (auth)/login.tsx        signup, verify, reset
  (tabs)/_layout.tsx      NativeTabs, role-conditioned triggers
  (tabs)/index.tsx        buyer → market, farmer → dashboard
  (tabs)/requests.tsx     buyer only
  (tabs)/listings.tsx     farmer only
  (tabs)/orders.tsx       both
  (tabs)/scan.tsx         both
  (tabs)/profile.tsx      both
  orders/[id].tsx         pushed at root, tab bar hidden
  checkout/[listingId].tsx
```

Six tab routes, five visible per role — the label is custom, so the buyer's `index` can read "Market" while the farmer's reads "Home". One route name means one deep link that resolves correctly per role; two parallel tab groups would collide on `orders` and produce ambiguous matches.

**Gate the tabs layout on the profile query.** Changing `hidden` dynamically remounts the navigator and resets navigation state. Render a splash until `role` is known, then mount the tab set once.

**Native tabs mount every screen eagerly**, so all five tabs fire their queries at app start. Gate expensive lists with `enabled: isFocused` on the query rather than unmounting the screen — a farmer on 3G shouldn't download a market page they never looked at.

Env — `.env.local` gitignored, `.env.example` committed:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

`EXPO_PUBLIC_*` values are inlined into the bundle. Only the anon key belongs here. The service role key and `FLW_SECRET_KEY` stay in Vercel and must never appear in the mobile repo.

Type generation:

```json
"scripts": {
  "gen:types": "supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts"
}
```

Regenerate after every migration, in both repos. Add a CI step that runs `gen:types` then `git diff --exit-code` so stale types fail at the PR instead of at runtime.

### Work that stays in the web repo

Additive patches only. No file moves, no config changes, nothing that touches the Vercel root directory:

1. `supabase/migrations/00029_mobile_support.sql`
2. `src/lib/supabase/request.ts` — bearer-aware context helper
3. Six routes switched to that helper; cookie behavior preserved for web
4. `sendPush()` called from `createNotification()`
5. A mobile branch in `/api/escrow/callback` → `302 thefarmyard://checkout?...`
6. New `GET /api/escrow/status`

Everything else in this plan applies unchanged.

---

## 4. Auth

```ts
// src/lib/supabase.ts  (mobile repo)
const LargeSecureStore = /* SecureStore with chunking — see note below */;

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: LargeSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,   // required in RN
    flowType: 'pkce',
  },
});
```

- **Session size.** Android `SecureStore` caps values at ~2048 bytes; a Supabase JWT session routinely exceeds that. Either chunk the value across SecureStore keys or use the standard pattern: AES key in SecureStore, ciphertext in AsyncStorage. Do this in M1, not as a bugfix later.
- **Refresh on foreground.** `AppState.addEventListener` → `startAutoRefresh()` on active, `stopAutoRefresh()` on background. Without this, tokens silently expire while the app is suspended and every request 401s on resume.
- **Deep links.** `scheme: "thefarmyard"` in `app.json`. Call `Linking.getInitialURL()` for cold start and subscribe for warm start. Handle `thefarmyard://auth/callback?code=...` → `exchangeCodeForSession(code)`.
- **Supabase dashboard → Auth → URL Configuration:** add `thefarmyard://auth/callback` and `thefarmyard://**` to allowed redirects, or every confirmation email is rejected.
- **Password reset:** `resetPasswordForEmail(email, { redirectTo: 'thefarmyard://auth/callback?next=reset' })`, then `updateUser({ password })` once the recovery session exists. Do not reuse the web 4-digit flow.
- **Signup:** the DB trigger `handle_new_user()` creates the profile. Mobile must not insert into `profiles` — just read it. If `full_name`/`phone_number`/`role` aren't passed in `options.data`, the trigger writes empty strings; pass them explicitly.
- **Role routing:** mirror `proxy.ts` logic client-side. A `(tabs)` layout that reads `profiles.role` and renders farmer or buyer tabs. Unknown role → buyer view, matching web behavior.

---

## 5. Data access

| Path | Use for |
|---|---|
| Direct Supabase (RLS-scoped) | Reads: listings, escrow rows, notifications, profile, traceability public data. Writes that are simple inserts: listings, buy requests, ratings. |
| Next.js `/api/*` | Anything with server-side money or secrets: escrow create, escrow status, notification device registration, webhooks. |

Do **not** reuse `src/lib/utils.ts#calculateEscrowFees` on mobile. Fees are computed server-side and returned; a client copy will drift and becomes an argument with a buyer.

### Bearer auth for the ~6 routes mobile calls

```ts
// src/lib/supabase/request.ts  (web repo)
export async function requestContext(req: NextRequest) {
  const header = req.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase.auth.getUser(token);
    return { user: data.user ?? null, supabase };
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return { user: data.user ?? null, supabase };
}
```

Returning the token-scoped client matters as much as the user — queries must run *as* the user or RLS evaluates as `anon`.

Routes to convert: `POST /api/escrow/create`, `GET /api/escrow/status` (new), `GET /api/notifications`, `POST /api/notifications/read`, `POST /api/notifications/read-all`, `GET|PUT /api/notifications/preferences`.

No CORS work needed — native fetch does not preflight.

### Schema additions (draft — review before applying)

```sql
-- 00029_mobile_support.sql

alter table public.escrow_transactions
  add column if not exists client_request_id uuid,
  add column if not exists flw_payment_link text;

create unique index if not exists escrow_buyer_request_uidx
  on public.escrow_transactions (buyer_id, client_request_id)
  where client_request_id is not null;

create table if not exists public.device_tokens (
  id          bigint generated by default as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token       text not null unique,
  platform    text not null check (platform in ('android', 'ios')),
  app_version text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

create policy "device_tokens_select_own" on public.device_tokens
  for select using (auth.uid() = user_id);
create policy "device_tokens_delete_own" on public.device_tokens
  for delete using (auth.uid() = user_id);

-- Token must be reassignable when a user signs out and another signs in on the
-- same handset. A unique(token) upsert under RLS cannot touch a row owned by
-- someone else, so registration goes through a definer function.
create or replace function public.register_device_token(
  p_token text, p_platform text, p_app_version text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.device_tokens (user_id, token, platform, app_version)
  values (auth.uid(), p_token, p_platform, p_app_version)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        app_version = excluded.app_version,
        updated_at = now();
end $$;

revoke all on function public.register_device_token(text, text, text) from public;
grant execute on function public.register_device_token(text, text, text) to authenticated;
```

`client_request_id` is the idempotency key. Without it, a double-tap on a slow connection creates two escrow rows and two payment links. Store the link on the row so a retry returns the same one.

### Push

- `createNotification()` in `src/lib/notifications.ts` is the single chokepoint. Add a fire-and-forget `sendPush(userId, title, body, data)` after the insert.
- Send via `https://exp.host/--/api/v2/push/send`, batching up to 100 tokens. Delete tokens on `DeviceNotRegistered`.
- Deep link in the payload: `{ url: "/orders/<id>" }`. The app router maps it.
- Android 13 needs `POST_NOTIFICATIONS` requested in context, not on first launch.

---

## 6. Screens

**Tabs (buyer):** Market · Requests · Orders · Scan · Profile
**Tabs (farmer):** Home · Listings · Orders · Scan · Profile

Stacks:

```
(auth)/login, (auth)/signup, (auth)/verify, (auth)/reset
(tabs)/index            buyer: search, category chips, commodity filter, grid
                        farmer: dashboard, active orders, payout summary
listings/[id]           listing detail, seller trust badge, quantity → checkout
checkout/[listingId]    quantity, fee breakdown (server-computed), pay CTA
checkout/result         deep-link landing, polls /api/escrow/status
orders/index            both roles, status segmented
orders/[id]             escrow state, delivery token, confirm receipt, ship (farmer)
listings/new            camera/gallery, compress, crop, price, location, publish
listings/index          farmer's own listings, active/paused
scan                    camera → /api/traceability/public/[ref]
notifications           list, mark read
profile                 profile, payout details, verification status, sign out
```

~17 screens. If it grows past 20 before M5, scope is leaking.

---

## 7. Milestones and review gates

| # | Deliverable | Est. | Gate |
|---|---|---|---|
| M0 | Template reset, `app.json` identity set, NativeTabs skeleton with five placeholders, Expo app on the physical device via EAS dev build, tokens + primitives, lint/typecheck/gen:types scripts | 1–2 d | **Review:** repo tree, app on device, tabs switching, types generated from the live schema |
| M1 | Supabase client + chunked session storage, login/signup/verify/reset, deep-link handling, role-gated tabs, profile read | 1 wk | **Review:** auth module, cold/warm start, token refresh across 24h |
| M2 | Query client + persisted cache, market list/detail/search/filters, shared types generated | 1.5 wk | **Review:** types pipeline, pagination, image caching |
| M3 | Listing creation: picker, compression, upload, publish; my-listings | 1 wk | **Review:** upload path on 3G, EXIF/large-file handling |
| M4 | Escrow checkout, idempotency, hosted payment handoff, deep-link return, status polling | 2 wk | **Review:** double-tap, cancel, kill-app-mid-payment, webhook reconciliation |
| M5 | Orders list/detail, dispatch, delivery token, confirm receipt, ratings | 1.5 wk | **Review:** state machine matches `escrowConfirm.ts` exactly |
| M6 | Push registration, delivery, deep links, notification list/prefs | 1 wk | **Review:** token reassignment across accounts, Android 13 permission |
| M7 | Traceability scan, error states, empty states, a11y pass, Play internal track | 1.5 wk | **Release review** |

Total: **9–11 dev-weeks**, Android v1.

M4 is the risk concentration. If it slips, everything after is schedule noise; don't compress M0–M1 to protect it.

---

## 8. Risks, ranked

1. **Payments not configured.** Core value prop doesn't function. Resolve before M4.
2. **Escrow state drift.** Two implementations of the same state machine (web checkout + mobile) will disagree. Mobile must treat the server as the only source of truth — poll, never infer.
3. **SecureStore size limit.** Bites at M1 with an opaque `"Invalid key"` error. Budget a day.
4. **Image weight on rural data.** A 5 MB photo costs a farmer real money. Compress to ≤1600 px / ~250 KB before upload, and show upload progress.
5. **Hand-written types.** `src/lib/types.ts` is 81 KB maintained by hand and mobile will not import it. Generate types from the DB in both repos and let CI fail on drift — do not copy that file across.
6. **Play Store review for financial features.** Escrow for physical goods is outside IAP, but Play asks for a payments declaration. Have the Flutterwave merchant documentation ready.

7. **Audit noise in the build toolchain.** `npm audit` reports 19 high advisories through `braces` (via `metro-file-map`) and `node-forge` (via `@expo/code-signing-certificates`). Both are build-time only, neither ships in the bundle, and as of October 2026 neither has a patched release — the installed versions (`braces` 3.0.3, `node-forge` 1.4.0) *are* the latest. `npm audit fix --force` proposes `expo@44`, which is a downgrade across fourteen SDKs, not a remediation. Do not run it. Re-check monthly and add `overrides` when upstream patches ship. CI should ignore these two GHSA IDs rather than gate on severity.
