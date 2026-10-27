import test from 'node:test';
import assert from 'node:assert/strict';
import { letterDraft, letterBlocks, letterWordCount } from '../src/cover-letter.mjs';
import { cleanPack } from '../src/application-data.mjs';

test('letter draft uses only supplied examples and company facts and requires two examples', () => {
  const input = { name: 'Casey Example', role: 'Release Manager', company: 'Example Ltd', manager: '', interest: 'I value careful release planning.', evidence: 'I coordinated release calendars.\nI reviewed change risks.', companyNotes: '' };
  assert.equal(letterDraft({ ...input, evidence: 'I coordinated release calendars.' }), '');
  const draft = letterDraft(input);
  assert.match(draft, /I coordinated release calendars/);
  assert.match(draft, /I reviewed change risks/);
  assert.doesNotMatch(draft, /website|award|revenue/);
  assert.ok(letterWordCount(draft) > 30);
  assert.deepEqual(letterBlocks('Dear Manager,\n\nMy paragraph.').map(block => block.text), ['Dear Manager,', 'My paragraph.']);
});

test('CV and letter preferences are bounded, whitelisted and survive pack cleaning', () => {
  const pack = cleanPack({ jobId: 'job-1', cvPreferences: { route: 'Referral', keep: 'Genuine result', remove: 'Old task', newInfo: 'New certificate to verify', rawCv: 'RAW_PRIVATE' },
    letter: { interest: 'A real reason', evidence: 'Two examples', manager: 'Sam', draft: 'Editable letter', rawFile: 'RAW_PRIVATE' } });
  assert.equal(pack.cvPreferences.route, 'Referral'); assert.equal(pack.letter.draft, 'Editable letter');
  assert.doesNotMatch(JSON.stringify(pack), /RAW_PRIVATE/);
  assert.equal(cleanPack({ cvPreferences: { route: 'Unknown' } }).cvPreferences.route, '');
});
