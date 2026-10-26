# RoleBridge

A private, device-only pilot for anyone looking for work, including people facing redundancy. Three starting directions lead to finding suitable roles, checking job matches or preparing for an interview. The returning-user dashboard keeps saved jobs, interview preparation and application outcomes together. CV reading, matching and document creation happen locally. OpenAI remains disconnected.

The tailored CV builder is paused in v0.10.0 and is absent from the active journey. Its source and previously saved data are retained for a possible future return; new interview packs do not create hidden CV drafts.
The homepage also welcomes people looking for their next role without redundancy. Northern Ireland visitors can open NIJobs searches or nijobfinder from the same vacancy page. nijobfinder prefills the selected role using its Keywords parameter, without restricting the job category; the user chooses a location on that site. These are external destinations, not additional imported feeds.

## Try it

With GitHub Pages configured for `main` → `/ (root)`, the app is served at:

https://cmcgerty88.github.io/Role-Bridge/

1. Choose **Find my next step**. New visitors start without an account or password; nothing is saved automatically.
2. Choose **Find roles that suit me**, **Check my job matches**, or **Prepare for an interview**. The first two routes use a reviewed profile before opening vacancies or saved-job comparisons. Interview preparation opens directly and does not require completing the main profile.
3. Upload a CV or enter a recent role and work examples manually. Review any extracted role, skills and examples. The app reuses reviewed information; raw CV text is never saved.
4. Use **Your profile → Choose a job → Interview prep → Track progress**. Optional work preferences and role exploration are under **Preferences & help**.
5. Explore UK/NI vacancies or add an advert manually. External search links share only the displayed role/location. **Continue to interview prep** opens the next step; **My saved jobs** opens match checks. Supply the full advert if a feed contains only a summary.
6. For interview preparation, provide CV evidence, the job description and any company/screening-call notes (or explicitly choose no extra information). Review them and create the pack.
7. Download the full pack as **PDF or Word**, with the same content, and **both cheat sheets in one two-page PDF**. Use **Practise answers & add my notes** to personalise your answers, then download again. Nothing submits an application.
8. **My job search** provides a next action, saved jobs and upcoming interviews. Each job opens its own preparation and application update form. Scheduled interviews are separate from completed interviews. Outcome observations appear after three valid application records; they suggest experiments, not causes or hiring probabilities.
9. Saving is optional and encrypted on this device. Returning users unlock existing data. Old profiles, interview notes and legacy CV fields remain compatible; deletion controls explain what is removed.

For the first round of feedback, use the [first-user pilot guide](docs/FIRST-USER-PILOT.md).
The original [fictional demo](research/rolebridge-demo.html), [sample PDF](research/rolebridge-sample.pdf), [provisional opportunity report](research/REEMPLOYMENT-OPPORTUNITY-REPORT.md) and [validation kit](research/VALIDATION-KIT.md) remain available.

## What works now

- Browser-based PDF, DOCX and TXT reading, with manual text entry as a fallback.
- Candidate-reviewed experience and skills; no invented achievements.
- Local role exploration using a small editorial catalogue of 17 business, service and technology-delivery role directions. Each provides explicit skill connections, questions for real adverts, an example to prepare and copyable search phrases.
- Saved role directions and next actions, with optional device saving. Previously saved profiles remain compatible.
- UK/Republic of Ireland work preferences, explicit currency and gross annual pay, working pattern, hours and sponsorship constraints.
- User-selected LinkedIn, Indeed and CV-Library searches for target/related titles; clearly labelled external searches with manual import retained. No scraping or direct imports from those providers.
- Target-role and local skill/location filtering of a shared vacancy pool, with one-click shortlist import and clear source/freshness limits. Reed collection is configured separately; see [vacancy-feed setup](docs/VACANCY-FEED-SETUP.md).
- Real-vacancy entry, conservative constraint checks, source-check dates and user-controlled essential-requirement confirmation.
- Encrypted opt-in autosaving, password unlock, inactivity lock, encrypted backup/restore, 30-day expiry and deletion controls.
- User goals, application dates/stages, completed interviews, follow-up actions, weekly counts and cautious rule-based recommendations.
- Optional local usefulness feedback with a minimised preview; nothing sent automatically.
- Interview questions and labelled sample answers for all 17 editorial roles, plus general, advert and company/process prompts; personal practice notes; matching PDF/Word/text packs; pre-interview and interview-day cheat sheets in one PDF.
- Responsive layout and keyboard-accessible forms/dialogs.

There is no external AI analysis, hosted candidate account, cloud candidate database or automatic application sending. Optional feedback email delivery uses a separately configured form service; candidate documents are not attached. Once configured, a scheduled collector retrieves a limited shared pool of public Reed search results; it never receives candidate searches or CVs. Vacancy links are not fetched by the app. Shared skill words do not prove qualification; open listings do not prove active hiring. Current market research in the report remains provisional.

OpenAI integration is deliberately deferred. This release needs no API key, billing setup, server or additional hosting. The existing GitHub Pages deployment serves the role catalogue and matching logic locally.

## How role exploration works

`src/roles.mjs` is a manually written exploration library, dated 18 October 2026. It is not a verified occupational taxonomy, a current labour-market study, or evidence that vacancies exist. Its scope is limited; it does not cover all occupations or skill wording.

Directions prioritise the candidate's target role, or current role when no target is entered. A direct catalogue title connection is shown first and does not infer any skills. Other suggestions must share a supported work area and responsibility level, with at least two distinct confirmed skill groups including one linked to the role's main work. Without a title, those skill rules operate alone. Unsupported occupations get a coverage message rather than an unrelated fallback. Up to five entries are shown. This is a limited editorial rule set, not a fit percentage, qualification judgement or hiring probability.

CV skill review uses a local vocabulary of 167 skill/tool labels with aliases, including release management, IT service management, software delivery, data, finance and operational work. Source excerpts show why each suggestion appeared. Blank skills fields are filled as an unreviewed draft after file reading or **Fill profile from this text**; additional labels can be transferred individually or with **Add all found skills**. Bulk transfer preserves existing entries, skips known alias duplicates and asks the user to review the resulting skills field. It never silently truncates entries to fit the field limit. Common negation and aspiration phrases are excluded conservatively. The vocabulary and wording rules are not exhaustive, and do not establish proficiency, certification or recency. Users can edit or add skills themselves. Source excerpts and raw CV text remain temporary and are excluded from encrypted profile persistence.

The CV reader also offers up to three work examples from the latest dated employment entry. It recognises common English work-history headings and year/month date ranges, compares end dates, and preserves source action statements (joining wrapped lines without rewriting achievements). A role selector resolves tied/current roles or uncertain dates. When the latest role is unambiguous, a recognisable title and its examples fill blank profile fields as a draft. The review checkbox is required before these imports can be saved or backed up. Existing text is preserved; users can also choose individual examples through the expanded review controls, and repeated statements are skipped. Contact details, employers, education, work preferences and target-role intentions are not imported automatically. Missing dates, unfamiliar layouts, scanned text and unrecognised wording may require manual selection. Fewer than three recognised examples are never padded with invented work or examples from another role.

Missing matches are areas to check, not a conclusion that the person lacks those skills. Roles can always be browsed and saved for exploration without matching. Actual job requirements, pay, work location, qualifications and eligibility must be checked against individual vacancies. Search phrases incorporate selected location/country and work pattern but are only plain text; the user decides whether to copy them into a search service.

The reviewed-data schema remains version 1 with optional role directions, profile goals, per-job progress, categorical feedback, reviewed CV-builder fields and up to five application packs. Older plaintext profiles can be explicitly migrated to a separate encrypted storage envelope; successful migration removes the plaintext key. Raw CV text is excluded.

CV-reading limits: 5 MB per file, 30 PDF pages and 100,000 extracted characters. Scanned PDFs need pasted text or a text-based export; OCR and password entry are not provided. DOCX extraction reads the main document text, including ordinary tables; separate headers, footers and footnotes are not included. Review the extracted text before using it.

## Personal data

The CV readers are bundled and served from this repository; no CDN is used. CV files and their text are processed in the browser and are not uploaded. The job-search workspace makes no analytics or external API calls. The separate, optional feedback page sends only seven explicitly entered answers to Formspree when configured; it never reads the workspace or CV. Explicit job-site search links send the displayed role/location to the chosen site; no CV or skill list is included. A separately configured GitHub Actions job can call Reed for public listings; candidate data is not part of those calls. GitHub Pages still receives ordinary hosting requests, and employer links open external websites when selected.

New passwords require 14–256 characters, at least one uppercase letter and one special character (punctuation or a symbol; spaces and numbers alone do not count). Existing workspace passwords and backups still unlock using the original password.

**Create private workspace** is local signup, not a verified online account. Explicit consent enables encrypted autosaving in browser localStorage. Web Crypto uses AES-256-GCM and PBKDF2-SHA-256 (600,000 iterations) with a random salt and fresh IV per save. The password and key are never persisted by the app. No recovery/reset or cloud sync is provided. Use a current browser over HTTPS and a trusted personal device. Try without saving holds information in the tab only.

**Lock workspace** and ten minutes without activity clear the unlocked page, including raw CV text. Application updates and vacancy edits must be submitted to become saved records. Reviewed interview inputs save on pack creation; practice notes autosave in an unlocked workspace. Legacy CV data remains in existing encrypted workspaces until explicitly deleted. Profile changes autosave after a short debounce; the status shows success/failure. Automatic lock attempts to save first but discards unsaved edits if storage fails. Expiry is 30 days after the last save, enforced by deletion on the next visit; no website can delete local storage while closed. Encrypted backups also expire and need the password to restore. Remove unwanted downloads/backups separately.

**Clear my information** removes both saved formats and resets current inputs. Encryption does not protect against compromised devices, malicious extensions/site code or someone using an unlocked workspace. GitHub Pages repositories share an origin; a dedicated origin is required before wider service deployment. See the review for threat boundaries, UK/EU GDPR considerations and future authentication/database requirements. Do not put real CVs, candidate exports or secrets in this repository or issues. All fixtures are fictional.

## Develop and verify

Node 22.13+ is required (Node 24 was used during development).

```sh
npm ci --ignore-scripts
npm test
npm run serve
```

`npm run serve` binds a development server to loopback port 8765. Set `PORT` to change it. This is for local development; GitHub Pages serves the published app directly, with no server process or build required.

For the browser tests:

```sh
npx playwright install chromium
npm run test:browser
```

If an appropriate Chromium is already installed:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser
```

In a cloud workspace with an unwritable default npm cache, use `npm --cache /tmp/rolebridge-npm ci --ignore-scripts`.

The checked-in `vendor/` files allow GitHub Pages to run without a CDN. Rebuild those copies only when intentionally updating dependencies:

```sh
npm run vendor
```

Use the lockfile and retain dependency licences. Do not disable TLS or checksum checks. `.nojekyll` makes Pages serve the static files directly.

## Next integration stage

Automated AI analysis still needs a separately hosted private backend and the privacy gates below. The prepared Reed job feed instead runs in GitHub Actions and publishes a shared static snapshot; matching stays in the browser. It needs a provider API account, a repository secret, suitable provider terms and Pages Actions deployment. Follow [the connection guide](docs/VACANCY-FEED-SETUP.md); check the collection and deployment workflow results for its current live status. Do not insert an API key into these public files or request one through a candidate form. Decide authentication, storage, deletion and processing notices before adding server-side CV handling.

A job-data provider must be checked for current UK/Irish coverage, permitted usage and prices. Employer vacancy feeds may be another route. Never label a generated job as a live opportunity or treat a vacancy's age as proof of a ghost job.

The current comparison logic is deliberately explicit: unknown essential requirements, salary or sponsorship remain uncertain; hard conflicts are shown; the candidate controls all applications and messages.

## Interview preparation and documents

Choose **Prepare for an interview** at the start, **Already have an interview?** on the landing page, or **Prepare for interview** on a saved job. This route works without completing the main profile first.

1. Upload a PDF, DOCX or TXT CV, reuse your reviewed workspace experience, or enter relevant experience manually. Review the extracted role, skills and examples; unfamiliar layouts need correction. No contact information is required.
2. Select a saved vacancy or paste a title and the full job description. Review one to three advert priorities. Saved descriptions can be corrected when creating the reviewed pack.
3. Add brief company research and interview-process notes from screening calls or invitations. Choose **I don’t have any extra information yet** if appropriate. Omit names, contact details, meeting links, access codes and confidential material.
4. Confirm these inputs and create the pack. Download PDF, Word (.docx) or text. The same content builder supplies all three formats. A separate PDF contains a pre-interview checklist and an interview-day cheat sheet, one A4 page each.
5. Open **Practise answers & add my notes** to view question-specific samples and write your own answers. Download again after editing. Reopen saved preparation from the job dashboard. **Manage this saved preparation** deletes that pack while keeping the saved job; older CV data in that pack is also removed after explicit warning.

The full pack includes a 20-minute plan, reviewed CV examples, transparent wording connections to advert priorities, evidence gaps, typical questions, sample answers, STAR worksheets, company/process notes, final checks and follow-up guidance. Sample answers are editorial practice material: hypothetical approaches, explicitly fictional worked examples, or bracketed starters to complete with verified facts. They are never inserted into personal practice notes or represented as the candidate’s history. Unsupported roles receive general and advert-specific prompts. No employer questions, hiring outcomes or skill proficiency are predicted.

Cheat-sheet excerpts can be shortened with an ellipsis; full source statements remain in the larger pack. Each sheet has fixed readable font sizes, line budgets and a one-page guard. Full PDFs paginate with section breaks and page numbers, capped at 30 pages. Word documents contain text paragraphs without macros or external relationships. Unsupported PDF characters produce a visible error; Word/text preserve them as a fallback.

Interview snapshots and company/process notes are bounded, excluded from persistence until reviewed creation, and stored per vacancy using the existing opt-in encrypted vault. Question/focus changes ask before deleting practice notes. Unreviewed inputs, raw CV text and uploaded files never enter encrypted saving. Removing a vacancy removes its pack. Existing expiry, backup and deletion rules apply.

Downloads are **unencrypted**, may contain personal work examples, and must be reviewed, stored and deleted by the user. Raw CV text, contact fields, unrelated jobs and preferences are excluded. The app cannot delete files outside the browser. OpenAI stays disconnected.

The paused CV builder source is not imported by the live app. Its UI browser scenarios are preserved under `tests/deferred-cv/` outside the active test suite; pure data/export and migration checks remain active. Legacy data is retained for explicit backup/deletion, not exposed as an available feature.

## Website feedback

The separate [feedback page](feedback/index.html) presents seven beta-feedback questions. Homepage and footer links open the form in a new tab. The questions can be filled in and cleared immediately, but sending remains disabled until `src/feedback-config.mjs` contains a valid public Formspree form endpoint. An explicit preview notice explains that unsent answers are lost on refresh or close. Set the recipient privately in the provider account; never put it in client code. See [setup and delivery checks](docs/FEEDBACK-SETUP.md). The feedback page imports no workspace modules, does not read/write browser storage, and sends only the reviewed survey answers after an explicit consent checkbox and submit action. Email delivery has not been verified merely by passing browser tests.
