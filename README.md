# OrderPilot prototype

Concept prototype by Ugonwa Ohagwasi. It builds step 1 of the architecture's build order ("static experience with labelled synthetic data"): the owner workspace and the customer order flow, running the PRD's order rules in the browser.

## Run it locally

Needs Node.js 20.9 or newer.

```
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

1. Create a new GitHub repository (for example `OrderPilot`) and upload everything in this folder. `node_modules` and `.next` are not included and must not be uploaded.
2. In Vercel, choose Add New, then Project, and import the repository. Vercel detects Next.js. Keep the default settings and deploy.
3. No environment variables or secrets are needed.

## What is real and what is simulated

| Area | Status |
| --- | --- |
| Lead time with 17:00 cut-off (BR-02, BR-03) | Real logic. Use "Jump past 17:00 closing" in the top bar to see it move |
| Size and flavour limits (BR-01, AT-01) | Real logic |
| Daily capacity, holds and conflicts (BR-06 to BR-08, AT-06) | Real logic, client side only |
| Deposit maths in minor units (BR-11, BR-12) | Real logic |
| Confirmation gate (BR-13) | Real logic |
| Payment claim vs verified vs confirmed (PAY-02, AT-09, AT-16) | Real states, manual verification simulated |
| Duplicate bank reference blocked (AT-10) | Real check against demo data |
| Double-tap submit creates one request (AT-07) | Real guard |
| AI extraction | Simulated with a fixed result for the sample message, including the outage state and an ignored prompt injection (AT-08, AT-26) |
| Accounts, email, payments provider, database | Not built. State lives in the browser's localStorage, synthetic data only |

All people, phone numbers, the bank details and Butterleaf Cakes are invented.

## Deviations from the architecture document

- Styling uses CSS custom properties in plain CSS files, not Tailwind. Tailwind remains the recommendation for a production build.
- No Supabase, server actions or row-level security. A prototype with persistence is step 2 of the build order.
- Demo clock is fixed at Monday 2 November 2026, 14:20 Lagos time so the PRD's worked examples behave the same for every visitor.

## Verified (2 November 2026)

- Production build passes with TypeScript strict mode.
- Playwright run of: quote accept, payment claim, duplicate reference rejection, verify, confirm, capacity conflict with alternative dates, AI capture to draft, full customer request, double-tap, 17:00 cut-off.
- axe-core automated scan (WCAG 2.2 A and AA rules) on 8 screens: no violations. This is automated checking only, not a manual screen reader test or a conformance claim.
- No horizontal scroll at 320, 390, 768 and 1440 px on 10 screens.

## Not verified

- Manual screen reader testing (VoiceOver, TalkBack, NVDA).
- Real devices and browsers other than Chromium.
- Any usability testing with bakery owners or customers.
