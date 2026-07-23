# NewsCred — Setup & Security Notes (updated)

## ⚠️ DO THIS FIRST (secrets were exposed)
The old `application.properties` containing real credentials was committed to git.
Even though it is now untracked, it still exists in git HISTORY. You must:

1. **Revoke the Gmail app password** (Google Account → Security → App passwords → remove it, create a new one if needed).
2. **Change your PostgreSQL password.**
3. **Generate a new JWT secret** (any random 32+ char string):
   PowerShell: `-join ((65..90)+(97..122)+(48..57) | Get-Random -Count 48 | % {[char]$_})`
4. If the repo is public on GitHub, purge history with BFG or make the repo private.
   Quick option: `git push` a fresh repo from this cleaned folder.

## Running the backend
Set environment variables before `mvn spring-boot:run` (PowerShell example):

    $env:DB_PASSWORD="your_new_pg_password"
    $env:JWT_SECRET="your_new_48_char_secret"
    $env:PAYSTACK_SECRET_KEY="sk_test_xxxxx"   # from dashboard.paystack.com (TEST mode)
    cd backend
    ./mvnw spring-boot:run

## Paystack (premium payments)
1. Create a free account at https://dashboard.paystack.com (choose Ghana).
2. Settings → API Keys & Webhooks → copy the **Test Secret Key** (`sk_test_...`).
3. Set it as `PAYSTACK_SECRET_KEY`. Price defaults to GHS 15.00
   (override with `PREMIUM_PRICE_PESEWAS`, e.g. 1500 = GHS 15).
4. Test cards: 4084 0840 8408 4081, any future expiry, CVV 408, PIN 0000, OTP 123456.
   Test Mobile Money numbers are in Paystack docs → "Test Payments".

## What changed (summary)
- Secrets removed from config; everything reads env vars now
- .gitignore fixed (it contained merge-conflict markers and broken entries)
- Junk files and build artifacts (target/, .expo/, stray shell files) deleted
- Security headers re-enabled; rate limiter now uses the JWT identity,
  not spoofable X-User-Id / X-User-Premium headers (headers removed from app too)
- IDOR fixed: users can only read/delete their own articles & accounts
- Free limit (3 analyses) now enforced SERVER-SIDE; app handles the 402 response
- Fake payment form REMOVED → real Paystack checkout (card + Mobile Money)
  with server-side verification before premium is granted
- Premium now gates the full forensic report (free tier: score + verdict + summary)
- Fake "trusted authors" list (Tom Hanks etc.) replaced with honest byline heuristic
- Mobile: API URL typo fixed, real refresh-token flow added (no more surprise logouts)
