# Vaiga Order Manager

An internal order-management app for **Vaiga Sweets & Snacks**, built to replace the
paper order book during Diwali season. It is used by staff (primarily on a phone) to
record orders that come in by WhatsApp, phone, or in person — it is **not** a
customer-facing storefront.

The app automatically works out, for every order:
- how many boxes and individual items were ordered,
- how many of each product are needed once box contents are expanded, and
- the total production requirement across all active (non-cancelled) orders.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Google Sheets as the database (via a service account, server-side only)
- Deploys to Vercel

## Project structure

```
src/
  app/                  Pages (Dashboard, Orders, Customers, Products, Boxes, Production)
    api/                Server-side API routes — the only code that talks to Google Sheets
  components/           Shared UI (nav, quantity selector, status badges, states)
  lib/
    types.ts            Domain types, mirroring the Sheets tabs
    sheets.ts           Low-level Google Sheets client (reads/appends/updates)
    repo.ts             Higher-level data access used by the API routes
    whatsapp/           WhatsApp bot: command parser, handler, Cloud API helpers, tests
    calculations.ts     Pure calculation engine — order totals, production totals,
                         customer totals. No I/O, so it's the easiest place to verify
                         the numbers are right.
scripts/
  seed.ts               Populates sample data (see "Sample data" below)
```

## 1. Local setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local — see "Google Sheets setup" below
npm run dev
```

Open http://localhost:3000.

## 2. Google Sheets setup

### 2a. Create the spreadsheet

1. Create a new Google Sheet (e.g. "Vaiga Diwali 2026 Orders").
2. Create six tabs, named **exactly** as below, with these header rows in row 1:

   | Tab | Columns (row 1) |
   |---|---|
   | `Customers` | `customer_id, name, phone, address, created_at, updated_at` |
   | `Products` | `product_id, name, price, active, category` |
   | `Boxes` | `box_id, name, price, description, active` |
   | `BoxContents` | `box_id, product_id, quantity` |
   | `Orders` | `order_id, customer_id, order_date, fulfillment_type, fulfillment_date, status, payment_status, notes, created_at, updated_at` |
   | `OrderItems` | `order_item_id, order_id, item_type, product_id, box_id, quantity, unit_price, unit_label` |
   | `ProductUnits` | `unit_id, product_id, label, context, price, active` |

   `unit_label` is a newer addition — if your sheet already exists from before, add
   that as an extra header in `BoxContents` (column D) and `OrderItems` (column H).
   `ProductUnits` is a whole new tab — create it the same way as the others, with
   just that one header row; the app fills it in as you add units on the Products
   page. Both only matter if you use the multi-unit feature (e.g. Halwa sold as
   pieces in boxes and by weight individually) — leave them alone and everything
   else works exactly as before.

3. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/<THIS_PART>/edit`.

### 2b. Create a Google Cloud service account

1. In the [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project.
2. Enable the **Google Sheets API** for that project.
3. Go to *IAM & Admin → Service Accounts → Create Service Account*. Any name is fine
   (e.g. `vaiga-order-manager`).
4. Open the new service account → *Keys* → *Add key* → *Create new key* → **JSON**.
   A JSON file downloads — keep it private, never commit it.
5. From that JSON file you need two values:
   - `client_email` → this is `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → this is `GOOGLE_PRIVATE_KEY`
6. **Share the Google Sheet** with the service account's email address (the
   `client_email` value) as an **Editor** — the same way you'd share it with a person.
   Without this step every API call will fail with a permissions error.

### 2c. Fill in `.env.local`

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=vaiga-order-manager@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
```

Paste `private_key` exactly as it appears in the JSON file, including the quotes and
the `\n` sequences — the app converts those back into real newlines at runtime.

## 3. Sample data

Once `.env.local` is filled in and the sheet tabs exist:

```bash
npm run seed
```

This adds 5 products, 2 boxes (with contents), 5 customers, and 10 orders (mixing
boxes-only, individual-only, and both) directly into your connected sheet — exactly
what's needed to verify Tests A–H below. Every seeded row's name/notes is prefixed
`[SAMPLE]` so you can find and delete it later in the Sheet itself.

## 4. Manually verifying the calculation engine (spec Tests A–H)

After seeding, open the Dashboard and Production page and confirm:

- **A/B/C** — Production page totals split "From boxes" vs "Individual" correctly,
  and a product used in two different boxes shows both contributions summed.
- **D** — the dashboard's total for a product equals the sum across all customers'
  orders for it (check via Products page → tap a product → customer breakdown).
- **E** — cancel a sample order from its Order Detail page → its quantities disappear
  from the Production page immediately.
- **F** — edit an order's items (via the API, or extend the Order Detail page's edit
  UI) → dashboard/production totals update.
- **G** — a customer with two seeded orders shows both, separately, on their
  Customer page, with combined totals.
- **H** — change a product's price on the Products page, then open an *existing*
  order — its stored total should be unchanged, because `unit_price` is captured on
  the order at creation time, not looked up live.

The core logic for all of this lives in `src/lib/calculations.ts` and is written as
pure functions with no I/O, specifically so it's easy to reason about and (if you add
a test runner later) easy to unit test in isolation.

## 5. Development commands

```bash
npm run dev      # local dev server
npm run build    # production build
npm run start    # run a production build locally
npm run lint     # lint
npm run seed     # populate sample data (see above)
```

## 6. Deploying to Vercel

1. Push this repo to GitHub (see "Git" below).
2. In Vercel, "Add New Project" → import the GitHub repo.
3. Under *Settings → Environment Variables*, add the same three variables from
   `.env.local` (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`,
   `GOOGLE_SHEET_ID`). When pasting the private key into Vercel's UI, keep the
   `\n` sequences as literal text (don't let it auto-convert to real newlines).
4. Deploy. Vercel builds with `npm run build` automatically.

## 7. Git

```bash
git init
git add .
git commit -m "Initial Vaiga Order Manager MVP"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

`.env.local` is already in `.gitignore` — never commit real credentials. Only
`.env.example` (with placeholder values) should be committed.

## 8. What's intentionally not built (V1 scope)

Per the project brief, this MVP does **not** include: customer-facing checkout,
customer accounts, online payments, coupons, or reviews. The architecture (typed
domain model in `types.ts`, a single calculation engine, and a thin Sheets data
layer) is meant to make it straightforward to layer these on later without a
rewrite.

## 9. WhatsApp bot (update orders by message)

Staff can update an existing order by sending a WhatsApp message to the shop's
WhatsApp Business number. The bot uses Meta's official **WhatsApp Cloud API**
and the app's existing order data (the same Google Sheet rows and update
functions the website uses) — it adds no new data store.

### Messages it understands

| Send | What happens |
|---|---|
| `status ORD0002` | Replies with customer, total, delivery status and payment status. Changes nothing. |
| `delivered ORD0002` | Marks the order **Delivered**. |
| `paid ORD0002 cash` | Marks it **Paid** and records the method as Cash. |
| `paid ORD0002 upi` | Marks it **Paid** and records the method as UPI. |
| `help` | Lists these commands. |

Notes:
- Commands are not case-sensitive. `ord2`, `ORD-0002` and `0002` all mean `ORD0002`.
  The short code printed on receipts (for example `VG-4821`) also works.
- A cancelled order can't be changed from WhatsApp (restore it in the app first).
- Sending the same command twice is safe: the second reply says "already …" and nothing changes.
- **Audit trail:** every change adds a line to the order's **Notes**, e.g.
  `[WhatsApp 2026-10-15T09:12:03.000Z from +919876543210] Marked Delivered (was Packed)`.
  Time is UTC. `status` and `help` change nothing, so they add no note.
- Messages from numbers that are not in `WHATSAPP_ALLOWED_NUMBERS` are ignored
  without a reply.

### Setup

1. **Create the Meta app.** Go to [developers.facebook.com](https://developers.facebook.com/apps),
   create an app of type **Business**, and add the **WhatsApp** product. Meta gives
   you a free test number to start with; to use the shop's own number, add and
   verify it under *WhatsApp → API Setup*.
2. **Collect the values** (see the table below) and put them in `.env.local`
   (and in Vercel's *Environment Variables* for the live site):

   | Variable | Where to find it |
   |---|---|
   | `WHATSAPP_VERIFY_TOKEN` | You invent it: any long random string. |
   | `WHATSAPP_ACCESS_TOKEN` | *WhatsApp → API Setup*. The temporary token expires in about 24 hours; for real use create a permanent one: *Business Settings → Users → System Users → Add → Generate token* with the `whatsapp_business_messaging` and `whatsapp_business_management` permissions. |
   | `WHATSAPP_PHONE_NUMBER_ID` | *WhatsApp → API Setup*, "Phone number ID" (not the phone number itself). |
   | `WHATSAPP_ALLOWED_NUMBERS` | Comma-separated staff numbers with country code, e.g. `919876543210,919123456789`. |
   | `WHATSAPP_APP_SECRET` | *App settings → Basic → App Secret*. Needed so the webhook can confirm each call really came from Meta. **Required in production.** |

   Optional: `WHATSAPP_GRAPH_VERSION` (defaults to `v21.0`).
3. **Deploy first.** Meta must be able to reach the webhook over HTTPS, so deploy
   to Vercel (with the variables above set) before the next step. For local
   testing, expose `npm run dev` with a tunnel such as `ngrok http 3000`.
4. **Register the webhook.** In your app go to *WhatsApp → Configuration → Webhook → Edit*:
   - **Callback URL:** `https://<your-domain>/api/whatsapp/webhook`
   - **Verify token:** the same value as `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and save**, then under *Webhook fields* **subscribe to `messages`**.
5. **Try it.** From an allowed number, send `help` to the business number. If you
   are using Meta's test number, first add your phone under *API Setup → "To"*
   and confirm the code Meta sends.

If the bot doesn't answer: check Vercel's function logs for `/api/whatsapp/webhook`.
The usual causes are a wrong `WHATSAPP_APP_SECRET` (the log says "Invalid
signature"), an expired access token, your number missing from
`WHATSAPP_ALLOWED_NUMBERS`, or the `messages` field not being subscribed.

WhatsApp only lets the bot send free-form replies within 24 hours of your last
message to it. That is always true here, because every reply answers a message
you just sent.

### Tests

```bash
npm test
```

Runs the command parser, the order-update logic (with an in-memory store, so no
Google Sheets or WhatsApp account needed), and the signature / allow-list checks.

## 10. A note on box content edits

Box *contents* (which products are inside a box, and in what quantity) are set when
a box is created. Editing a box's price/name/active flag is supported from the
Boxes page; changing what's *inside* an existing box after creation isn't wired up
in the UI yet — for now, disable the old box and create a new one with corrected
contents. (The data layer already supports the underlying replace-rows pattern used
for order items, in `replaceOrderItems` in `src/lib/sheets.ts`, so wiring up a
"edit contents" button later is a small, contained change.)
