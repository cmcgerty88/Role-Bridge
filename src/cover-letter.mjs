// A local, editable starting point. Candidate statements are copied verbatim;
// the app never infers achievements or company facts from a website address.
export function letterDraft({ name, role, company, manager, interest, evidence, companyNotes }) {
  const examples = evidence.split(/\n+/).map(line => line.trim().replace(/^[•*-]\s*/, '')).filter(Boolean).slice(0, 3);
  if (!interest.trim() || examples.length < 2) return '';
  const salutation = manager.trim() ? `Dear ${manager.trim()},` : 'Dear Hiring Manager,';
  const first = `I am applying for the ${role} position at ${company}. ${interest.trim()}`;
  const evidenceParagraph = `My experience is relevant to this role in several ways. ${examples.map(x => x.replace(/[.!?]$/, '') + '.').join(' ')}`;
  const companyParagraph = companyNotes.trim()
    ? `From the company information I have reviewed: ${companyNotes.trim()}`
    : `I would welcome the chance to learn more about the priorities for this role at ${company}.`;
  return `${salutation}\n\n${first}\n\n${evidenceParagraph}\n\n${companyParagraph}\n\nI would welcome a conversation about how this experience could support the work described in your vacancy. Thank you for considering my application.\n\nYours sincerely,\n${name}`;
}
export function letterBlocks(text) {
  return text.trim().split(/\n\n+/).filter(Boolean).map((paragraph, index) => ({ text: paragraph, style: index === 0 ? 'subtitle' : 'body' }));
}
export function letterWordCount(text) { return text.trim() ? text.trim().split(/\s+/).length : 0; }
