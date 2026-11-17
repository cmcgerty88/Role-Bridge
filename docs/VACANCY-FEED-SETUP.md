# Connect the UK vacancy pool

The matching interface and Reed adapter are built. Live listings require a successful configured workflow and Pages deployment; use the run summary and the site's listing count to check your deployment. Automated development tests use synthetic API responses. The checked-in `data/vacancies.json` is an explicit empty, unconfigured marker, not the deployed feed or sample jobs. A successful collection replaces it only in the deployment artifact. OpenAI is not needed.

## LinkedIn, Indeed and CV-Library

Manual **Add a vacancy** remains available. The suggestions page offers searches for the target role (or current role when no target is entered) and related titles constrained by that role focus and confirmed skills, with saved directions available to fill spare choices. At most three choices appear. These are ordinary links to LinkedIn, Indeed and CV-Library, not live listings fetched into the app. No external request is made until the candidate selects a link. Only the displayed role and location are placed in that search URL; no CV, name, experience text or skill list is included. A blank location defaults to the United Kingdom. The provider may require sign-in, change its search interface or interpret locations differently; these destinations have not been live-verified from this workspace.

### Northern Ireland sites

NIJobs and nijobfinder are offered alongside the UK-wide sites, without claiming a verified traffic ranking. NIJobs uses its `/jobs/<role>/in-<location>` route, with safely encoded path segments; a blank location defaults to Northern Ireland. nijobfinder uses `/jobs/?Keywords=<selected role>#browsing`, based on a public results URL supplied by the user. The example’s transport/distribution/warehousing category is deliberately omitted. Only the role is sent; no location parameter was established, so the user chooses a location on that site. Both destinations remain external sites rather than imported vacancy sources; live provider behaviour has not been verified from this workspace.

Direct import from these sites is not implemented or authorised by a normal user account. It requires a provider-approved feed/API or a licensed job-data partner covering those sources. No scraping, session-cookie collection, browser-login automation or bypass of site access controls is included. Do not label the prepared Reed pool as containing LinkedIn or Indeed listings. For now, a candidate can open the search, choose a vacancy and add it manually. The Reed connection below is the prepared route for one-click import inside RoleBridge.

## One-time Reed setup

1. Request a jobseeker API account at [Reed’s developer page](https://www.reed.co.uk/developers/jobseeker). Review the current API agreement, permitted public display/caching, attribution, limits and any charges for this use. The connector uses the search endpoint and short summaries; it is not a scraping tool or a licence to redistribute data outside the agreement. Provider documentation/account access could not be verified from this development workspace.
2. In [this repository’s Actions secrets settings](https://github.com/cmcgerty88/Role-Bridge/settings/secrets/actions), choose **New repository secret**. Name it **REED_API_KEY** and paste the key there. Do not paste it into chat, an issue, a candidate form, a source file or a public repository variable.
3. In [Settings → Pages](https://github.com/cmcgerty88/Role-Bridge/settings/pages), change **Build and deployment → Source** to **GitHub Actions**. This is required for generated listings to be included in the published site; a branch-only Pages build would serve the empty marker in Git.
4. Open [Actions → Publish RoleBridge and UK vacancy pool](https://github.com/cmcgerty88/Role-Bridge/actions/workflows/vacancies.yml), select **Run workflow** on `main`, and check that publication succeeds. A configured secret is not proof that the provider account works.
5. Open the site, choose a target role and try **Suggested vacancies**. Confirm the retrieval timestamp, a representative Belfast/Northern Ireland result if available, source links and summary accuracy against Reed. If no matching listing exists, broaden the role or location rather than interpreting this as a failed job search. Validate the live provider contract before inviting people to rely on the pool.

Once connected, the workflow refreshes daily at 06:17 UTC and on pushes to main. GitHub may delay scheduled jobs. There is no separately hosted app server, candidate database or OpenAI connection. Without the feed secret, push and manual runs can still publish the website through GitHub Actions; no new vacancies are collected.

## What the first pool covers

### If the workflow is green but no jobs appear

Open the latest **Publish RoleBridge and UK vacancy pool** run and read its summary. A green website deployment does not confirm fresh vacancies. The summary distinguishes a skipped feed from a collection with a specific listing count. Push and manual runs publish the website even without `REED_API_KEY`; collection is skipped with a warning and the bundled pool is used as-is. Scheduled runs without a configured feed skip publication.

- **Website published but feed not refreshed:** add `REED_API_KEY` as a repository **Actions secret**, not a repository variable. The configuration job cannot read environment-only secrets. Then rerun the workflow.
- **Collected 0 listings:** the generated pool is empty. Check the provider response/collector before changing candidate filters.
- **Collected listings, but the site says “not connected”:** confirm the deployment step succeeded, Pages Source is **GitHub Actions**, and you opened the deployed GitHub Pages site rather than a local or downloaded copy. Refresh the page.
- **“0 suggestions from [a positive number] listings”:** the feed loaded, but the title, confirmed skills or location filters found no matches. The site offers a temporary view of matching roles across all locations when available, or **Browse all listings** to inspect the pool without matching filters. These views do not change saved preferences; unfiltered jobs are explicitly not personalised suggestions. Region names are not mapped to towns (for example, Northern Ireland will not match a listing that only says Belfast). Try a shorter target title or a town name for a new search. The pool is limited; this does not establish that no suitable jobs exist.
- **Pool stale or could not load:** check the latest collection/deployment and the site's `data/vacancies.json` response. Do not paste API keys or candidate data into troubleshooting messages.

The collector performs 32 fixed public searches: 16 job topics, including release management, each with a UK-wide and an explicit Northern Ireland query. It requests the first 50 results from each search, deduplicates job IDs and caps the snapshot at 1,000 listings. See `SEARCH_TOPICS` and `publicQueries()` in `scripts/refresh-vacancies.mjs` for the exact scope. Every visitor receives this same pool; the collector does not receive candidate profiles or search-form inputs.

This is a limited pool, not an exhaustive index of UK jobs. Availability in a particular town, occupation or seniority is not guaranteed. Northern Ireland is queried explicitly, but actual regional coverage must be checked once the provider is connected. Country-based search scope is not proof of work authorisation or where a remote role can be performed. Imported jobs leave work-country eligibility, salary units, sponsorship, essentials, working pattern and vacancy status unknown until reviewed.

Matching happens in the browser using the target title and confirmed skills. A chosen target requires at least 75% of its meaningful title words to appear in the listing title. Without a target, at least two confirmed skill phrases must occur in the summary. Exact target phrases rank first, then title words and skill connections. The location filter matches listed words, not geography or commute distance. These are explainable word connections, not a fit score, semantic CV analysis, verified qualifications or hiring probability.

## Privacy, freshness and failure handling

- Browsers download the same fixed same-origin JSON path. No CV text, candidate name, role query, location or cookies are sent to Reed by the app. Reed advert links and the clearly labelled job-site searches open external sites only when selected, with no referrer. The latter explicitly include the displayed search role and location. Hosting still receives normal network request metadata.
- A new optional target-role field is included in the existing encrypted profile. Imported job details/provenance use the existing encrypted shortlist when saving is enabled. No extra candidate storage or analytics is introduced.
- The collector reads only the API secret and fixed configuration. Authentication is in an HTTPS Basic header, never a URL. Redirects are rejected so credentials cannot follow a redirect. Auth failures and rate limiting stop the run; a total outage or incompatible response leaves the previous deployed snapshot unchanged. Other partial failures are labelled as reduced coverage.
- Listed closing dates are honoured when parseable. Invalid closing dates are excluded. Date-only closing dates are conservatively treated as ending at the next UTC midnight. Unknown dates stay unknown. A retrieval timestamp does not establish current hiring intent or a user-verified open advert.
- Snapshots older than 72 hours are hidden from suggestions. Adding a listing rechecks its age and expiry. A refresh does not change or delete a candidate’s existing shortlist, outcomes or CV drafts. Saved jobs must still be checked at the original source.
- Only whitelisted public listing fields enter the deployment. Provider payloads, credentials, tests and workflow files are excluded. Refreshed listings are **not committed to Git history**. The deployment artifact is configured for one-day retention; provider terms must permit the public display and platform retention involved. The deployed snapshot stays available until a successful replacement. Client-side hiding is not deletion from the public JSON.
- To disable and remove the public pool, remove the repository secret, switch Pages back to the `main` root branch source and rebuild the site with the checked-in unconfigured marker. This does not erase third-party caches or change candidates’ private saved shortlists.

## Development and verification

`npm test` covers adapter contracts, credential/header handling with a synthetic key, rate limits, outages, deduplication, dates, safe URLs, matching and serialization. Browser tests intercept the fixed JSON request with fictional jobs and exercise one-click import, comparison, CV download, encrypted continuity, source failures, local filtering and mobile/project-path hosting. Synthetic fixtures are kept under tests, never in the public pool.

To refresh locally after obtaining an authorised key, set `REED_API_KEY` securely in the execution environment and run `npm run refresh:vacancies`. Do not put the key into a shell command stored in history. A missing key fails without changing the pool. Live collection, account limits and GitHub Pages Actions publication remain unverified until the setup steps above are completed.
