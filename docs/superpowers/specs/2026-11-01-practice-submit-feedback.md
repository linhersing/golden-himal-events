# Practice submission feedback repair

User report: on mobile, saving a filled application gives no visible completion or useful rejection. Screenshot contact_phone=0966 fails the server's existing 8–30 character rule. Status is above the long form, outside the viewport; the button never describes its pending state.

Repair the existing portal, retaining D1, role isolation, the user's data, external work links and no-email/no-charge boundaries. No schema changes.

Approach: field errors and an error summary beside the submit action; pending text and a locked form during requests; a focused, scrolled receipt showing the real application ID, name, round and submitted link only after matching server readback. Keep draft values on failures. Distinguish a confirmed write whose follow-up read failed from a fully verified receipt, with a read-only retry. Reconcile an uncertain network response by reading the member's same-round entry and comparing submitted values, never automatically POST again or claim another entry is this submission. Clear receipt/draft on role change or logout. Keep persisted saved entries available after refresh.

Other portal actions must expose their working/success/error feedback in the visible viewport. All new copy in English, Nepali and Traditional Chinese. Meet 320/360/375/390/428px and desktop layouts; no clipped links, 44px actions, accessible focus and live feedback, respect reduced motion.

Alternatives considered: a toast alone would not provide a durable receipt; a new page/router would add unnecessary state and navigation risk. Use an in-page receipt and the existing member dashboard.

Acceptance: real-handler browser tests cover short phone, slow response, confirmed save, server rejection, committed write + failed read, lost POST response, conflicting existing entry, re-login, score save and three-language mobile layout. CI is browser/SQLite evidence; separate remote HTTPS acceptance remains required after deployment. Never modify or clean the user's workspace.
