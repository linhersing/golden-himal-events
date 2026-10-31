# Real email test delivery and recovery

The owner requests an actual invited signup→email→signin→performance-link→mock registration-fee workflow, followed by separate judges. Real payment integration remains undecided and must stay disabled. Cloud readiness is currently blocked, and Mailgun Free account creation is still incomplete.

Add an explicitly selected Mailgun sandbox adapter alongside the existing Cloudflare Email binding. Fixed official US/EU HTTPS endpoints, sandbox-only domain validation, sender-domain matching, Cloudflare Secrets for the API key, no tracking, no Mailgun testmode, no logging of keys/OTP/provider bodies, no automatic retries. Queued acceptance is not delivered proof.

Each OTP request has a non-secret reference visible in email and UI, a ten-minute single-use code, existing three-per-ten-minute server limit, a one-minute UI resend cooldown and translated recovery instructions. Failed sends must not leave a usable challenge. Never add a fixed code or bypass login.

One Gmail inbox can receive five exact plus aliases for one member, three judge accounts and an organizer. These are independent synthetic database roles, not five people or independent real jurors; never use them to establish official voter identity. Verify every recipient separately with Mailgun. Keep the actual alias list private in Cloudflare, not source or shared logs.

The same browser profile shares cookies across tabs. Test roles sequentially with logout, or use separate user-selected browser profiles/devices. GPT and Gemini must not mutate the same session or application at once. There is no claim that Gemini has stopped; record the recommended division in BRIDGE.
