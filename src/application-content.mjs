import { companyResearchBlocks } from './company-research.mjs';
import { sampleAnswer } from './interview-answers.mjs';
import { normalise, hasPhrase, findSkillMentions } from './model.mjs';
import { cleanPack } from './application-data.mjs';
import { ROLE_CATALOGUE } from './roles.mjs';
import { interviewQuestions } from './interviews.mjs';
import { contextBlocks } from './interview-context.mjs';
import { preparationEvidenceBlocks, suggestedRequirements } from './interview-prep-content.mjs';
const lines = value => value.split('\n').map(s => s.trim()).filter(Boolean);
export async function sourceKey(profile, job) {
  const value = JSON.stringify([profile.currentRole, profile.evidence, profile.skills, job.title, job.employer, job.description]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
export function suggestedRole(job) {
  return ROLE_CATALOGUE.find(r => r.terms.some(term => normalise(job.title).includes(normalise(term))))?.id || '';
}
export async function createPack(profile, job) {
  const skills = [...new Set(profile.skills.split(/[,;\n]/).map(s => s.trim()).filter(Boolean))];
  const matched = skill => hasPhrase(job.description, skill);
  skills.sort((a, b) => Number(matched(b)) - Number(matched(a)));
  // Rank exact, reviewed passages. Never rewrite achievements or manufacture facts.
  const vocabulary = [...new Set(normalise(job.description).split(' ').filter(w => w.length > 4))];
  const score = passage => vocabulary.filter(word => hasPhrase(passage, word)).length;
  const evidence = lines(profile.evidence).sort((a, b) => score(b) - score(a));
  const selectedEvidence = []; let used = 0;
  for (const passage of evidence) { if (used + passage.length + 1 <= 4000) { selectedEvidence.push(passage); used += passage.length + 1; } }
  return cleanPack({ jobId: job.id, sourceKey: await sourceKey(profile, job), summary: profile.currentRole,
    skills: skills.join(', '), highlights: selectedEvidence.join('\n'), roleId: suggestedRole(job),
    focus: suggestedRequirements(job.description) });
}
export function cvIssues(cv, pack) {
  const issues = [];
  if (!cv.anonymous && !cv.fullName.trim()) issues.push('Add the name you want on your CV, or choose an anonymised CV.');
  if (!cv.anonymous && !cv.email.trim() && !cv.phone.trim()) issues.push('Add an email address or phone number, or choose an anonymised CV.');
  if (!pack.summary.trim() && !pack.highlights.trim()) issues.push('Add a truthful professional summary or relevant achievements.');
  if (!cv.history.trim() && !cv.education.trim()) issues.push('Add employment/voluntary experience or education so the reader can understand your background.');
  return issues;
}
export function keywordReview(job, pack) {
  const recognised = findSkillMentions(job.description);
  const text = `${pack.summary}\n${pack.skills}\n${pack.highlights}`;
  return { included: recognised.filter(skill => hasPhrase(text, skill)), check: recognised.filter(skill => !hasPhrase(text, skill)) };
}
const block = (text, style = 'body') => ({ text, style });
export function cvBlocks(cv, pack, job) {
  const result = [block(cv.anonymous ? 'Candidate CV' : cv.fullName.trim(), 'title'), block(`Target role: ${job.title}`, 'subtitle')];
  if (!cv.anonymous) {
    const contact = [cv.email, cv.phone, cv.location].map(v => v.trim()).filter(Boolean).join(' | ');
    if (contact) result.push(block(contact));
  }
  const section = (heading, text, bullets = false) => {
    if (!text.trim()) return;
    result.push(block(heading, 'heading'));
    for (const line of lines(text)) result.push(block(bullets ? `• ${line.replace(/^[•*-]\s*/, '')}` : line));
  };
  section('Professional summary', pack.summary);
  section('Skills', pack.skills);
  section('Selected achievements', pack.highlights, true);
  section('Experience', cv.history);
  section('Education', cv.education);
  section('Certifications and training', cv.certifications);
  return result;
}
export function interviewBlocks(job, pack) {
  const role = ROLE_CATALOGUE.find(r => r.id === pack.roleId);
  const result = [block('Interview preparation', 'title'), block(job.title, 'subtitle'), block(job.employer),
    block(`Practice focus: ${role?.title || 'General role preparation'}`),
    block('These are typical practice questions, not questions supplied or guaranteed by the employer. Confirm the role focus against the advert. Use only truthful examples.'),
    block('Your 20-minute preparation plan', 'heading'), block('5 minutes: read the three advert priorities and choose your strongest examples. 10 minutes: practise your introduction and two answers aloud. 5 minutes: choose questions to ask and check the interview arrangements.'),
    block('How to use the sample answers', 'heading'), block('Examples below show structure and reasoning. Fictional examples are not your career history. Answer starters contain brackets for facts only you can supply. Keep your own notes separate and use only claims you can support.'),
    block('How to practise', 'heading'), block('Use Situation, Task, Action and Result (STAR). Keep most of the answer on what you personally did. State only results you can support. If experience is missing, explain the gap and how you would learn.'),
    { ...block('1. Know the role and your evidence', 'heading'), pageBreak: true }, ...preparationEvidenceBlocks(pack), ...contextBlocks(pack), ...companyResearchBlocks(pack), { ...block('2. Practise your answers', 'heading'), pageBreak: true }];
  interviewQuestions(job, pack).forEach((q, index) => {
    const sample = sampleAnswer(q, job, pack);
    result.push(block(`${index + 1}. ${q.question}`, 'heading'), block('What to cover: ' + q.guidance), block(sample.label, 'subtitle'), block(sample.text), block(sample.adapt));
    const answer = pack.answers.find(a => a.id === q.id)?.answer.trim();
    result.push(block(answer ? `Your practice notes:\n${answer}` : 'Your practice notes — use only facts you can support.\nSituation / Task: __________________________________________\nMy actions: ______________________________________________\nResult / learning: _________________________________________'));
  });
  result.push({ ...block('3. Final checks', 'heading'), pageBreak: true }, block('Check the format and time, research the employer using reliable sources, review the advert and your submitted CV, and choose two questions to ask. You can ask about interview adjustments without adding medical information to this pack.'));
  result.push(block('If redundancy comes up', 'heading'), block('A concise, factual answer is enough: “My role ended through redundancy. I am now looking for [the work you want next], where I can contribute [relevant strength].” Use this only if it reflects your situation; you do not need to share private financial or personal details.'), block('After the conversation', 'heading'), block('Write down the topics covered, what you want to improve and the agreed next steps. Record the outcome in My job search. Follow up according to the timeline the employer gave you.'));
  return result;
}
export function plainText(blocks) { return blocks.map(b => b.text).filter(Boolean).join('\n\n') + '\n'; }
