// Whitelist reviewed document inputs; never retain a raw uploaded CV here.
import { cleanCompanyResearch } from './company-research.mjs';
import { cleanInterviewContext } from './interview-context.mjs';
const text = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n) : '';
export const blankCv = () => ({ fullName: '', email: '', phone: '', location: '', history: '', education: '', certifications: '', anonymous: false });
export function cleanCv(v = {}) {
  v = v && typeof v === 'object' ? v : {};
  return { fullName: text(v.fullName, 120), email: text(v.email, 200), phone: text(v.phone, 80), location: text(v.location, 160),
    history: text(v.history, 12000), education: text(v.education, 3000), certifications: text(v.certifications, 2000), anonymous: v.anonymous === true };
}
export function cleanPack(v = {}) {
  v = v && typeof v === 'object' ? v : {};
  return { jobId: text(v.jobId, 80), sourceKey: text(v.sourceKey, 64), summary: text(v.summary, 1800), skills: text(v.skills, 2000), highlights: text(v.highlights, 4000), roleId: text(v.roleId, 80),
    focus: text(v.focus, 900), prep: v.prep && typeof v.prep === 'object' ? { role: text(v.prep.role, 160), skills: text(v.prep.skills, 2000), evidence: text(v.prep.evidence, 4000) } : null,
    interviewContext: cleanInterviewContext(v.interviewContext), companyResearch: cleanCompanyResearch(v.companyResearch),
    answers: Array.isArray(v.answers) ? v.answers.slice(0, 13).filter(a => a && typeof a.id === 'string').map(a => ({ id: text(a.id, 100), answer: text(a.answer, 1000) })) : [] };
}
export function cleanPacks(v, jobIds) {
  if (!Array.isArray(v)) return [];
  const seen = new Set();
  return v.map(cleanPack).filter(p => { if (!p.jobId || !jobIds.includes(p.jobId) || seen.has(p.jobId)) return false; seen.add(p.jobId); return true; }).slice(0, 5);
}
