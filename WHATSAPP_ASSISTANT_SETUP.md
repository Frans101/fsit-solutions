# FS IT Solutions Assistant — WhatsApp backend (not yet deployed)

A hybrid chatbot for the **official Meta WhatsApp Cloud API**. Initial version is deterministic menu routing and technician handover; AI replies are **not** enabled.

## Prerequisites
1. Verify your WhatsApp Business App number is eligible for **Coexistence** through a provider/onboarding flow that explicitly supports it. **Do not migrate, disconnect or delete the existing app.**
2. Obtain the Meta WhatsApp Business Account ID, **Phone Number ID**, Meta App Secret, Cloud API access token, and set your own random webhook verify token. Do not commit any tokens.
3. In Supabase SQL Editor, review and run `supabase/whatsapp_tables.sql`.
4. Deploy `supabase/functions/whatsapp-webhook/index.ts` as a Supabase Edge Function with **JWT verification disabled** (Meta does not send Supabase JWTs). Security is enforced by GET verify token and POST HMAC signature checks.
5. Configure Supabase Edge Function secrets: `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Never expose these in frontend code.
6. Set the Meta webhook callback URL to `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`; use the same verify token; subscribe to the WhatsApp **messages** field. Verify the phone number ID matches your connected number.
7. Test with a permitted test recipient before any production activation.

## Behavior
- MENU/START resets the menu.
- 1–4 provide structured responses.
- 5/HUMAN/AGENT activates human handover and stops further bot replies until MENU/START.
- Webhook payload signatures are checked and message IDs are deduplicated.
- No AI, automated quotations, payments, outbound campaigns, or customer profile collection.
- Messages are processed but their bodies are not stored. Phone numbers and processed message IDs are stored.
- Message delivery failures need monitoring and retry handling before production; reserved IDs currently prevent duplicate sends but may also prevent retries after a failed send.
- To return a conversation to the bot, the customer sends MENU. A separate authenticated staff console can be built later.
- Implement consent/privacy notice, retention cleanup, monitoring and rate limiting before public launch.

## Important
This repository code **does not itself connect WhatsApp**. A verified Meta API account, backend deployment and configuration are required. Coexistence eligibility and mobile app continuity must be confirmed separately.
