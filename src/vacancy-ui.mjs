import { parsePool, rankVacancies } from './vacancy-pool.mjs';
import { jobSearchLinks, searchRoleOptions } from './job-search-links.mjs';
const $ = id => document.getElementById(id);
const node = (tag, value, className) => { const el = document.createElement(tag); if (value !== undefined) el.textContent = value; if (className) el.className = className; return el; };
export function initVacancies({ getState, updateSearch, addJob, navigate, showOptionalTools = false, prepareJob }) {
  let pool = null, generation = 0, shown = 10, view = 'matched';
  function changeView(next) {
    view = next; shown = 10; render();
    $('vacancy-pool-status').tabIndex = -1;
    $('vacancy-pool-status').focus({ preventScroll: true });
  }
  function viewButton(label, next) {
    const button = node('button', label, 'secondary'); button.type = 'button';
    button.addEventListener('click', () => changeView(next)); return button;
  }
  function renderBoardLinks() {
    const previous = $('jobsite-role').value;
    const options = searchRoleOptions({ ...getState().profile, targetRole: $('vacancy-target').value }, getState().roleDirections);
    $('jobsite-role').replaceChildren(...options.map(({ title }) => {
      const option = node('option', title); option.value = title; return option;
    }));
    $('jobsite-role').disabled = !options.length;
    if (options.some(option => option.title === previous)) $('jobsite-role').value = previous;
    renderSelectedBoardLinks(options);
  }
  function renderSelectedBoardLinks(options = searchRoleOptions({ ...getState().profile, targetRole: $('vacancy-target').value }, getState().roleDirections)) {
    const title = $('jobsite-role').value, place = $('vacancy-location').value.trim();
    const option = options.find(item => item.title === title);
    $('jobsite-search-summary').textContent = option ? `${option.reason}. Search for “${title}” in ${place || 'the United Kingdom'}.` : 'Enter a target role above to create searches, or review your skills to explore related titles.';
    const links = jobSearchLinks(title, place);
    $('jobsite-links').replaceChildren(...links.map(({ site, url }) => {
      const link = node('a', `Search ${site}`, 'secondary'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-describedby', 'jobsite-sharing'); return link;
    }));
  }
  function render() {
    const list = $('vacancy-suggestions'); list.replaceChildren();
    $('vacancy-more').hidden = true;
    if (!pool) return;
    if (pool.status !== 'ready') {
      $('vacancy-pool-status').textContent = pool.status === 'not_configured'
        ? 'The UK vacancy feed is not connected yet. No current vacancies are available inside this pool. You can search the job sites above, then use Add a vacancy to compare one you find.'
        : 'The vacancy pool has not refreshed in the last 72 hours. Older suggestions are hidden until it refreshes. Jobs already in your shortlist are kept; check their original adverts.';
      return;
    }
    const profile = getState().profile;
    const matches = view === 'browse'
      ? pool.jobs.map(job => ({ job, reasons: ['Unfiltered listing — check whether this role and location suit you.'] }))
      : rankVacancies(pool.jobs, profile, view === 'all-locations' ? { location: '' } : {});
    const target = profile.targetRole.trim();
    const count = view === 'browse'
      ? `Browsing all ${matches.length} listings in this limited UK pool. These are not personalised suggestions.`
      : `${matches.length} suggestions from ${pool.jobs.length} listings in this limited UK pool.${view === 'all-locations' ? ' Showing role or skill matches across all listed locations.' : ''}`;
    $('vacancy-pool-status').textContent = `${count} Retrieved ${new Date(pool.fetchedAt).toLocaleString()}.${pool.partial ? ' Some searches failed during the last refresh, so coverage is reduced.' : ''} This is not every UK vacancy or confirmation that an employer is still hiring.`;
    if (profile.country === 'IE') $('vacancy-pool-status').textContent += ' Your work preference is the Republic of Ireland; this first feed covers UK listings only.';
    if (view !== 'matched') {
      list.append(node('p', 'This is a temporary view. Your saved target role and location have not changed.', 'hint'));
      list.append(viewButton('Back to my matches', 'matched'));
    }
    if (!pool.jobs.length) {
      list.append(node('p', 'The feed loaded, but it contains no usable, unexpired listings. Changing your search cannot reveal jobs in an empty pool. Try the job-site searches above or return after the next feed update.', 'notice'));
      return;
    }
    if (!matches.length) {
      list.append(node('p', target ? 'No listings in this pool match that title and location. Try a related title or a broader location. A missing match says nothing about your employability.' : 'Enter the role you want, or confirm at least two relevant skills in your experience summary. Suggestions use title words and skill mentions, not an AI assessment.', 'notice'));
      const elsewhere = rankVacancies(pool.jobs, profile, { location: '' }).length;
      const actions = node('div', undefined, 'button-row');
      if (view === 'matched' && profile.locations.trim() && elsewhere) {
        list.append(node('p', `${elsewhere} role or skill matches are available without the location filter. Locations are matched by words, so a region such as Northern Ireland will not match an advert that only says Belfast.`, 'hint'));
        actions.append(viewButton(`Show ${elsewhere} matches across all locations`, 'all-locations'));
      } else if (target) {
        list.append(node('p', 'The title filter requires most of your target title’s words to appear in the advert title. This limited pool may use different titles or may not cover your role.', 'hint'));
      }
      actions.append(viewButton(`Browse all ${pool.jobs.length} listings`, 'browse'));
      list.append(actions);
      return;
    }
    for (const { job, reasons } of matches.slice(0, shown)) {
      const card = node('article', undefined, 'card vacancy-suggestion'); card.dataset.poolId = job.id;
      card.append(node('h3', job.title), node('p', `${job.employer} · ${job.location || 'Location not provided'}`, 'small muted'));
      const why = node('ul', undefined, 'small'); for (const reason of reasons) why.append(node('li', reason)); card.append(why);
      const details = node('details'); details.append(node('summary', 'Advert summary and what to check'), node('p', job.description, 'small preserve-lines'));
      details.append(node('p', 'This is a short provider summary. Check the full advert for responsibilities, pay, working pattern, sponsorship and essential requirements before preparing a CV or applying. Shared words do not establish qualification.', 'hint'));
      if (job.source.expiresAt) details.append(node('p', `Provider closing date: ${new Date(job.source.expiresAt).toLocaleDateString()}.`, 'hint'));
      card.append(details);
      const actions = node('div', undefined, 'button-row');
      const link = node('a', 'Read full advert on Reed'); link.href = job.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
      const exists = getState().jobs.some(j => j.id === job.id || j.url === job.url);
      const add = node('button', exists ? 'In my shortlist' : 'Add to my shortlist', 'secondary'); add.type = 'button'; add.disabled = exists;
      const message = node('p', '', 'small'); message.setAttribute('role', 'status');
      add.addEventListener('click', () => {
        const result = addJob(job);
        if (result === true) { add.textContent = 'In my shortlist'; add.disabled = true; message.textContent = showOptionalTools ? 'Added. Choose Prepare for interview to create a pack using this job description and your experience.' : 'Added to your shortlist. Review the job match and full advert before applying.'; }
        else message.textContent = result;
      });
      actions.append(add);
      if (showOptionalTools) {
        const prepare = node('button', 'Prepare for interview', 'primary'); prepare.type = 'button'; prepare.hidden = !exists;
        prepare.addEventListener('click', () => prepareJob(job.id));
        add.addEventListener('click', () => { prepare.hidden = !add.disabled; });
        actions.append(prepare);
      }
      card.append(actions, message); list.append(card);
    }
    $('vacancy-more').hidden = matches.length <= shown;
  }
  async function load() {
    const token = ++generation;
    $('vacancy-pool-status').textContent = 'Loading the shared UK vacancy pool…';
    $('vacancy-suggestions').replaceChildren(); $('vacancy-more').hidden = true;
    $('vacancy-refresh').disabled = true;
    try {
      // Fixed same-origin request. No candidate search terms, skills, CV or cookies are sent.
      const response = await fetch(new URL('../data/vacancies.json', import.meta.url), { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Unavailable');
      const raw = await response.text(); if (raw.length > 24000000) throw new Error('Too large');
      const parsed = parsePool(JSON.parse(raw)); if (token !== generation) return;
      pool = parsed; render();
    } catch {
      if (token !== generation) return;
      pool = null;
      $('vacancy-pool-status').textContent = 'The vacancy pool could not be loaded. Please try again. Your shortlist and saved progress are unchanged.';
    } finally { if (token === generation) $('vacancy-refresh').disabled = false; }
  }
  $('vacancy-search-form').addEventListener('submit', event => {
    event.preventDefault(); updateSearch($('vacancy-target').value.trim(), $('vacancy-location').value.trim()); shown = 10; view = 'matched';
    renderBoardLinks();
    if (pool) render(); else load();
  });
  $('vacancy-more').addEventListener('click', () => { shown += 10; render(); });
  $('vacancy-refresh').addEventListener('click', load);
  $('vacancy-edit-profile').addEventListener('click', () => navigate(1));
  $('vacancy-target').addEventListener('input', renderBoardLinks);
  $('vacancy-location').addEventListener('input', () => renderSelectedBoardLinks());
  $('jobsite-role').addEventListener('change', () => renderSelectedBoardLinks());
  return { open() {
    const { profile } = getState(); $('vacancy-target').value = profile.targetRole || profile.currentRole; $('vacancy-location').value = profile.locations;
    shown = 10; view = 'matched'; renderBoardLinks(); load();
  } };
}
