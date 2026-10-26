# Private-recipient website feedback

## What is ready

The HTML page is at `feedback/index.html` and will publish at https://cmcgerty88.github.io/Role-Bridge/feedback/. The eight questions stay on the website. Formspree handles receipt and forwarding to an email address configured privately in its dashboard. No hosting move or OpenAI integration is needed. Formspree offers a free tier with submission limits; check the current account quota and terms before enabling it.

The owner-supplied public endpoint `https://formspree.io/f/mgaaazwd` is configured. After publication, sending is enabled and the preview-only notice is hidden. Homepage and footer feedback links open a separate tab. Recipient settings and inbox delivery still need to be verified in the owner's Formspree account and mailbox. Automated tests use intercepted requests only; they do not verify real email delivery.

To disable delivery, set the endpoint to an empty string and republish. Answers can still be selected, typed and cleared, but sending is disabled and a preview notice explains that answers are lost on refresh or close. Nothing is queued, saved or sent while unconfigured.

## Configuration and delivery checks

1. Create a form in your own account at https://formspree.io/. Set the destination email privately in that account and complete the provider's verification steps.
2. Copy its **public form endpoint**, shaped like `https://formspree.io/f/abcdefgh`. This form ID is safe to put in the site; it is not an API key. Do not use an endpoint containing the email address.
3. Set `FEEDBACK_ENDPOINT` in `src/feedback-config.mjs` to that URL, then commit and publish. Alternatively, provide that public endpoint to the developer. Do not share account passwords, private tokens or API keys.
4. Keep the service's spam protection enabled. Where the account supports allowed-domain restrictions, restrict it to the actual site hostname. A public form ID is not authentication; client validation and CORS do not prevent a determined sender from submitting directly. Confirm service quotas and spam handling rather than claiming the browser prevents abuse.
5. Review the provider's processing/retention settings and terms for the account, confirm the pilot organiser's identity and the proposed notice, and set a reminder to delete provider submissions, inbox copies/trash and exports 30 days after the pilot ends. This is an operator task, not automatic website deletion. Browser clear/expiry controls do not delete submitted feedback.
6. Open the published feedback page in a private browser window. Submit one clearly labelled synthetic test response without personal data. Check the provider dashboard and the recipient inbox/spam folder. Delete the test response afterwards. A green website message means the provider accepted the request, not proof it reached the inbox.
7. Confirm the email address is not shown in the page, form action, browser request payload or client configuration. Once delivery is verified, share the feedback link and the prepared LinkedIn post.

The page uses JSON POST with credentials omitted and no referrer. It allows connections only to the fixed Formspree host, blocks native form navigation, validates the exact `/f/<id>` URL shape, and never displays provider response bodies. Only the six fixed choices, two optional bounded text answers and constant form metadata are submitted. The provider still receives ordinary request metadata including IP addresses. No names, email, files, CV or workspace identifiers are requested or attached. Written answers can nevertheless identify a person; do not call the form guaranteed anonymous.

The success message appears only after a successful HTTP response. On a timeout or network error, it explains that delivery is uncertain, retains answers in the tab and discourages immediate resubmission. There are no automatic retries. A send guard prevents duplicate clicks during a pending request; the service remains responsible for delivery and abuse controls. Free-text inputs accept at most 1,000 characters each. Clearing answers sends nothing, and form inputs are not persisted by the app.

## Visibility of older contact information

Earlier public feedback drafts included the owner's address at their request. Current Markdown and Word files have been cleaned. The address may remain in older commits, downloaded copies, caches and forks. This release does not rewrite history or promise to erase those copies. Hiding the recipient in the new form prevents new client-side exposure; it cannot make a previously published address secret again.
