# PhishGuard

**English** | [Русский](README.ru.md)

A web service that checks suspicious emails, text messages and chat messages for phishing and social engineering. Paste the text, and an LLM returns a verdict (`dangerous` / `suspicious` / `safe`), a confidence score, the red flags it found, and advice on what to do next. Built for Kazakhstan: it knows local banks and services (Kaspi, Halyk, Forte, Onay), and both the UI and the analysis are available in Russian, Kazakh and English.

**Live demo:** https://projectphishquard.vercel.app

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase Edge Function (Deno, TypeScript) and Postgres
- **LLM:** `openai/gpt-4o-mini` via OpenRouter, `temperature: 0`, JSON output
- **Hosting:** Vercel (frontend auto-deploys from `main`); Supabase CLI for migrations and function deploys

## Architecture

```
Browser (React) ──► Supabase Edge Function `analyze-email` ──► OpenRouter (LLM)
                          │
                          └──► Postgres: per-IP rate limit, total checks counter
```

- The frontend talks only to the Edge Function. The LLM provider key lives in the function's secrets and never reaches the browser.
- The function enforces the rate limit (5 checks per IP per day), builds the prompt in the UI language, calls the model, validates the JSON response and updates the counter.
- Errors are returned as codes (e.g. `rate_limit_exceeded`); the frontend maps them to localized messages.

During prototyping, an AI coding assistant reported that the LLM provider key might be exposed in the frontend. A code review showed otherwise: the frontend had always gone through the Edge Function, and the key had never left the server. The old key was still revoked after the backend moved to a dedicated Supabase project.

## Tuning the prompt against false positives

Early versions flagged ordinary bank SMS as suspicious. The prompt was refined using real-world messages:

- The verdict depends on a **combination** of signals (lookalike domain + pressure + a request for credentials). A single neutral signal can't produce high confidence, and an empty list of red flags always means `safe`.
- "Never share this code with anyone, not even a bank employee" is treated as a sign of a **legitimate** message, not a threat.
- Transactional SMS and bank promotions whose links all point to the official domain or its subdomains (`forte.kz`, `something.forte.kz`) are `safe`; a promotion deadline is marketing, not pressure.
- Lookalike domains (`forte-kz.com`, `f0rte.kz`, `forte.kz.bonus-credit.ru`) and URL shorteners don't qualify for this exception, so it can't be bypassed with a fake link.
- Every rule exists in all three language versions of the prompt and is covered by regression scenarios: bank phishing, BEC ("the CEO is in a meeting, pay this supplier now"), "Mom is in the hospital, send money", "a friend texting from a new number", plus legitimate verification codes and bank ads.

## Vulnerabilities found and fixed

- **Inflating the checks counter.** By default, Postgres grants `EXECUTE` on new functions to `PUBLIC`, so anyone with the public anon key could call `rpc('increment_total_checks')` and inflate the stats. Execution was revoked from `PUBLIC`, `anon` and `authenticated` and granted only to `service_role`, which the Edge Function uses. The `SECURITY DEFINER` function also got a pinned `search_path`, so it can't be hijacked by objects in another schema. See the [migration](supabase/migrations/20261109120000_harden_increment_total_checks.sql).

## Checked and not vulnerable

- **Bypassing the per-IP limit by spoofing `X-Forwarded-For`.** The function takes the client IP from the first entry of `X-Forwarded-For`, which would be attacker-controlled if the proxy appended to a client-sent header. A live test against the deployed function disproved this: requests with different fake IPs in `X-Forwarded-For` all decremented the same counter, and the 6th request got `429`. Temporary header logging showed why: Cloudflare in front of Supabase discards the client's `X-Forwarded-For` and writes its own (`<client IP>,<client IP>, <AWS proxy IP>`), strips `X-Real-IP` and rejects a client-sent `CF-Connecting-IP`. `True-Client-IP` and `Forwarded` do pass through unchanged, so the code never reads them. The assumption is documented next to `getClientIp` in the function, and the test should be re-run if Supabase changes its gateway.

## Running locally

Create a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then:

```bash
npm install
npm run dev
```

## Background

The MVP was generated with Bolt.new; the backend was then migrated by hand to a dedicated Supabase project, and the code has been developed independently since.
