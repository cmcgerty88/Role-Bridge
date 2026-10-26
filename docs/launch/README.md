# RoleBridge tester launch materials

- [LinkedIn company-page banner](../../src/assets/rolebridge-linkedin-banner.png)
- [First LinkedIn page post](linkedin-first-post.md)
- [Seven-question feedback form and proposed notice](tester-feedback.md)
- [Word questionnaire for Microsoft Forms import](rolebridge-tester-questionnaire.docx)

The post has not been published and a live Microsoft Form has not been created. The owner-supplied Formspree endpoint is configured; recipient settings and inbox delivery still need checking privately in the service account and mailbox. No recipient address belongs in these public files. The website stays at https://cmcgerty88.github.io/Role-Bridge/; no hosting migration or OpenAI integration is part of this release.

## Add the banner

Open the banner on GitHub and use **Download raw file** to save the PNG. On your LinkedIn company page, open its admin view, edit the cover image and upload it. The supplied artwork is a wide 2158 × 729 master. Use LinkedIn's crop preview to centre the band containing the logo, brand name and tagline. Essential content sits in the middle band for the shallower company-page cover; the left side is intentionally clear to allow for the page-avatar overlap. Check the mobile preview before saving. LinkedIn can change its cover sizing and cropping interface.

## Website feedback page

The preferred route is now the HTML feedback page at https://cmcgerty88.github.io/Role-Bridge/feedback/. It sends only the seven answers through Formspree when a public form ID has been configured. Follow [feedback setup](../FEEDBACK-SETUP.md). No live Microsoft Form has been created; the Word questionnaire and instructions below remain an alternative draft.

The recipient must be set in the service account, not in HTML, JavaScript, documentation or the Word file. The owner's address has been removed from the current public drafts, but earlier Git revisions may still contain it. Git history has not been rewritten.

## Create the Microsoft Form

1. Sign in at https://forms.office.com/ with the Microsoft account that will manage the pilot responses.
2. If **Quick Import** is available, select **Upload from this device**, choose `rolebridge-tester-questionnaire.docx`, and import it as a **Form**, not a quiz. Availability and labels vary by Microsoft account. If import is unavailable, choose **New Form** and copy the seven questions from `tester-feedback.md`.
3. Review the import: there should be exactly seven questions. Confirm options are separate choices and that the description hasn't become an extra question. Use `tester-feedback.md` as the source of truth; import is not guaranteed to preserve all formatting or settings.
4. Make questions 1, 2, 3, 4 and 6 single-answer **Choice** questions and mark them required. Questions 5 and 7 are optional **Text** questions with **Long answer** enabled. Add their subtitles from the Markdown guide. Disable question shuffling so the experience questions stay in order.
5. Add an appropriate participant notice for Microsoft Forms and a public contact route you are comfortable disclosing. Do not copy the website’s Formspree notice into a Microsoft Form. Set the completion message from the guide if the account supports a custom message.
6. Under **Collect responses**, choose **Anyone can respond** so external testers can participate without signing in. Where a **Record name** setting is shown, leave it off. Do not add email/name fields or file uploads. A one-response-per-person setting can require sign-in, so leave it off for this open pilot. If external responses are restricted by your organisation, resolve that with the administrator or use an appropriate account; don't invite testers to a form they cannot open.
7. Keep ownership/collaboration restricted. Do not share the response-summary or results link. Confirm the account is secured and that you can delete responses and exports at the end of the stated retention period; Microsoft Forms does not enforce this proposed schedule for you.
8. Preview the form on desktop and mobile, then open its respondent link in a signed-out/private browser and submit one synthetic test response. Confirm it appears only in the private responses area, then delete the test response.
9. If choosing Microsoft Forms instead of the website form, replace the website-feedback link in `linkedin-first-post.md` with the **Collect responses** respondent link. Check both links before publishing. You can send the public respondent link here for a review of the invitation copy; don't share an edit, collaboration or results link.

Don't put real responses, CVs, participant contact lists or downloaded response spreadsheets into this public repository. The form collects feedback through Microsoft, unlike the app's local-only CV processing. Review Microsoft account terms and privacy information for the account you use; this draft is not a compliance certification.
