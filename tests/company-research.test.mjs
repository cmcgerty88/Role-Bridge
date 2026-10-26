import test from 'node:test';
import assert from 'node:assert/strict';
import { safeCompanyUrl, cleanCompanyResearch, companyResearchBlocks } from '../src/company-research.mjs';
import { cleanPack } from '../src/application-data.mjs';
import { interviewBlocks, plainText } from '../src/application-content.mjs';
import { interviewQuestions } from '../src/interviews.mjs';
import { sampleAnswer } from '../src/interview-answers.mjs';
import { preInterviewSheetBlocks, interviewDaySheetBlocks } from '../src/interview-prep-content.mjs';
import { blankState, cleanJob, serialiseState, restoreState } from '../src/model.mjs';
const research = { url: 'https://example.com/about', notes: 'Provides scheduling software for clinics. Its stated priority is reliable service.' };
const job = cleanJob({ id: 'research-job', title: 'Release Manager', employer: 'Example company', description: 'Coordinate releases and improve reliability.' });
const pack = cleanPack({ jobId: job.id, roleId: 'release-manager', focus: 'Coordinate production releases.\nReview service readiness.\nImprove release planning.', prep: { role: 'Release Manager', evidence: 'Coordinated releases across several teams.' }, interviewContext: { status: 'provided', company: 'Recruiter mentioned a team expansion.', process: 'Panel interview.' }, companyResearch: research });

test('company URL allows public HTTPS source links and rejects private/tracking credentials and unsafe schemes', () => {
  assert.equal(safeCompanyUrl(' https://Example.com/about '), research.url);
  for (const value of ['', null, 'example.com', 'javascript:alert(1)', 'data:text/html,unsafe', 'http://example.com', 'https://person:password@example.com', 'https://example.com/?token=private', 'https://example.com/#secret', 'https://example.com:8443', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://work.local', 'https://ex\nample.com', 'https://example.com/' + 'x'.repeat(1000), 'https://example.com/' + 'é'.repeat(400)]) assert.equal(safeCompanyUrl(value), '', String(value));
});
test('research whitelist and bounds survive restore without copying raw pages, contact data or unrelated fields', () => {
  const cleaned = cleanCompanyResearch({ ...research, notes: '\u0000' + 'x'.repeat(5000), rawHtml: 'RAW_PAGE', cv: 'RAW_CV' });
  assert.equal(cleaned.notes.length, 4000); assert.deepEqual(Object.keys(cleaned), ['url', 'notes']);
  const state = blankState(); state.jobs = [job]; state.packs = [pack];
  assert.deepEqual(restoreState(serialiseState(state)).packs[0].companyResearch, research);
  assert.deepEqual(cleanPack({}).companyResearch, { url: '', notes: '' });
  assert.equal(pack.prep.evidence, 'Coordinated releases across several teams.');
  state.jobs = []; assert.equal(restoreState(serialiseState(state)).packs.length, 0);
});
test('full output includes the exact supplied research, source and honest prompts without claiming the website was read', () => {
  const output = plainText(interviewBlocks(job, pack));
  for (const expected of ['Know the company', research.url, research.notes, 'not independently verified', 'has not visited this website', 'What do you know about Example company', '60-second answer', 'Recruiter mentioned a team expansion.']) assert.ok(output.includes(expected), expected);
  const question = interviewQuestions(job, pack).find(q => q.id === 'company-knowledge');
  assert.match(sampleAnswer(question, job, pack).label, /complete with checked facts/);
  assert.match(sampleAnswer(question, job, pack).text, /\[what the company does\]/);
  for (const blocks of [preInterviewSheetBlocks(job, pack), interviewDaySheetBlocks(job, pack)]) {
    assert.match(plainText(blocks), /example.com/); assert.ok(plainText(blocks).includes(research.notes));
  }
});
test('URL-only research never produces invented company facts; notes remain usable without extra screening information', () => {
  const urlOnly = cleanPack({ companyResearch: { url: research.url }, interviewContext: { status: 'none' } });
  assert.match(plainText(companyResearchBlocks(urlOnly)), /No company information has been retrieved/);
  assert.equal(interviewQuestions(job, urlOnly).filter(q => q.id === 'company-knowledge').length, 1);
  const notesOnly = cleanPack({ companyResearch: { notes: research.notes }, interviewContext: { status: 'none' } });
  assert.match(plainText(companyResearchBlocks(notesOnly)), /Source URL not supplied/);
  assert.equal(notesOnly.companyResearch.notes, research.notes);
  assert.deepEqual(companyResearchBlocks(cleanPack({})), []);
});
test('all 13 possible practice answers survive saving, including company research and closing questions', () => {
  const questions = interviewQuestions(job, pack); assert.equal(questions.length, 13);
  const saved = cleanPack({ ...pack, answers: questions.map(q => ({ id: q.id, answer: 'A reviewed practice note.' })) });
  const state = blankState(); state.jobs = [job]; state.packs = [saved];
  assert.deepEqual(restoreState(serialiseState(state)).packs[0].answers.map(a => a.id), questions.map(q => q.id));
});
