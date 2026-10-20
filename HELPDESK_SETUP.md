# FS IT Solutions Helpdesk V1 — activation checklist

## What has been committed
- `helpdesk.html`: responsive public support form and staff dashboard
- `helpdesk.css`, `helpdesk.js`: styling, form handling, Supabase Auth login and admin ticket updates
- `supabase/helpdesk_schema.sql`: helpdesk tables, admin membership, RLS and update guard
- `supabase/helpdesk_submit_rpc.sql`: service-role-only submission function with per-email hourly throttling
- `supabase/functions/helpdesk-submit/index.ts`: validated public ticket intake API

## Activation (not completed by a GitHub commit)
1. Open Supabase project `memecdfwzhdicsrpzudw` → SQL Editor. Review and run `supabase/helpdesk_schema.sql`, then `supabase/helpdesk_submit_rpc.sql`.
2. Supabase → Edge Functions → deploy `helpdesk-submit` from the committed source. Set **Verify JWT = OFF** because the public form is unauthenticated. The function uses its private service role and validates input. Never put the service role key in browser code or public GitHub.
3. Set Edge Function secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` if not already available as managed environment variables. Verify they are available in the function environment.
4. Create your technician account in Supabase Authentication → Users (use a strong password, enable MFA where supported). Copy the user's UUID.
5. In SQL Editor, grant admin access by executing `insert into public.helpdesk_admins(user_id) values ('YOUR_USER_UUID');` with the real UUID. Do not make this table publicly writable.
6. Test at `https://frans101.github.io/fsit-solutions/helpdesk.html`: create a ticket and verify a new row exists in `support_tickets`. Then sign in as the approved admin, check that the ticket appears, update its status and sign out.
7. Test that a non-admin Supabase user cannot read/update tickets and that unauthenticated REST requests cannot read tickets.

## Known limitations / launch checklist
- This is a V1 implementation, **not yet live-tested**. The Edge Function and SQL must be deployed manually.
- Admin auth uses an access token **in memory only**. Refreshing the page signs the admin out; there is no silent refresh.
- For production, add Cloudflare Turnstile or equivalent anti-bot verification, IP/device-level throttling at the edge, monitoring, and automated cleanup/retention.
- The database RPC currently limits to 3 tickets per hour per email, which alone does not stop attackers from rotating email addresses.
- Confirm POPIA privacy policy, consent and retention periods. Customer status lookup is not exposed publicly; customers must contact support with their ticket reference.
- WhatsApp integration is a **separate pending deployment**; this version creates website tickets only.
- GitHub Pages may not be appropriate for operating a production e-commerce business. Review hosting before enabling real orders/payments.
- Use HTTPS and validate that the form and admin flows work on actual mobile browsers.
