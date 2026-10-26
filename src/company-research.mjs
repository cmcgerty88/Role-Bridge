// User-supplied public sources and notes only. Never fetch or infer company facts.
export function safeCompanyUrl(value) {
  if (typeof value !== 'string' || value.length > 1000 || /[\u0000-\u0020\u007f]/.test(value.trim())) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port) return '';
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname) || /\.(?:localhost|local|internal)$/i.test(url.hostname)) return '';
    return url.href.length <= 1000 ? url.href : '';
  } catch { return ''; }
}
export function cleanCompanyResearch(value) {
  return {
    url: safeCompanyUrl(value?.url),
    notes: typeof value?.notes === 'string' ? value.notes.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, 4000).trim() : ''
  };
}
export function hasCompanyResearch(pack) {
  const research = cleanCompanyResearch(pack.companyResearch);
  return Boolean(research.url || research.notes);
}
export function companyResearchBlocks(pack) {
  const { url, notes } = cleanCompanyResearch(pack.companyResearch);
  if (!url && !notes) return [];
  const block = (text, style = 'body') => ({ text, style });
  return [
    { ...block('Know the company', 'heading'), pageBreak: true },
    block(url ? 'Company website / source to check: ' + url : 'Source URL not supplied. Check your notes against the company’s official website before the interview.'),
    block('Your supplied research — not independently verified. RoleBridge has not visited this website or checked these facts. Check that the source belongs to the right company and that information is current.'),
    block('What I learned', 'heading'),
    block(notes || 'Only a website address has been recorded. No company information has been retrieved. Visit its About, products/services, values and news pages, then add a few factual notes.'),
    block('Four things to know before the interview', 'heading'),
    block('1. What does the company do, and who are its customers or users?\n2. Which products, services or activities matter to this role?\n3. What values or recent priorities can you support with a source?\n4. Why does that interest you, and how could your experience help?'),
    block('Turn research into a 60-second answer', 'heading'),
    block('Choose two checked facts from your notes, explain why one matters to this role, then connect it to one truthful example of your own work. If your notes do not answer a point, research it or ask the interviewer; do not fill the gap with an assumption.'),
    block('An informed question to ask', 'heading'),
    block('“I read about [specific product, service or priority] on your website. How would this role contribute to it, and what would success look like in the first few months?” Replace the bracket with something you have checked.')
  ];
}
// A compact reminder for the bounded cheat sheets. Full notes remain in the pack.
export function companyResearchReminder(pack) {
  const { url, notes } = cleanCompanyResearch(pack.companyResearch);
  if (!url && !notes) return '';
  return (url ? `Source: ${new URL(url).hostname}. ` : '') + (notes ? `My research: ${notes}` : 'Website recorded only — research two facts before the interview.');
}
