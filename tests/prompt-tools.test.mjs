import test from 'node:test';
import assert from 'node:assert/strict';
import { cvPrompt } from '../src/prompt-tools.mjs';

test('CV prompt uses the saved vacancy and excludes candidate details by default', () => {
  const input = { job: { title: 'Release Manager', employer: 'Example Ltd', description: 'Coordinate releases and manage risk.' },
    cv: { fullName: 'PRIVATE_NAME', email: 'PRIVATE_EMAIL', history: 'PRIVATE_HISTORY' },
    pack: { summary: 'PRIVATE_SUMMARY', skills: 'Jira', highlights: 'PRIVATE_RESULT', companyResearch: { url: 'https://example.com/', notes: 'A checked company fact.' } } };
  const safe = cvPrompt(input);
  assert.match(safe, /Release Manager/); assert.match(safe, /Coordinate releases/);
  assert.doesNotMatch(safe, /PRIVATE_NAME|PRIVATE_EMAIL|PRIVATE_HISTORY|PRIVATE_SUMMARY|PRIVATE_RESULT/);
  assert.match(safe, /cover letter/i); assert.match(safe, /Never invent/); assert.match(safe, /0–100 match assessment/);
  const included = cvPrompt({ ...input, includeEvidence: true });
  assert.match(included, /PRIVATE_HISTORY|PRIVATE_SUMMARY/);
  assert.doesNotMatch(included, /PRIVATE_NAME|PRIVATE_EMAIL/);
});
