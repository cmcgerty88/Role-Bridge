import test from 'node:test';
import assert from 'node:assert/strict';
import { blankState, cleanJob, serialiseState, restoreState } from '../src/model.mjs';
import { searchNextAction, upcomingInterviews } from '../src/search-journey.mjs';
import { cleanProgress, progressError } from '../src/progress-model.mjs';
import { diagnose } from '../src/progress.mjs';
const now = Date.parse('2026-10-22T12:00:00Z');
function ready() {
  const state = blankState();
  state.profile.currentRole = 'Release Manager'; state.profile.evidence = 'Coordinated production releases across four teams.';
  return state;
}
const job = (id, progress = {}) => cleanJob({ id, title: id, progress });
test('next action follows real work: profile, vacancy, application; conflicts are not promoted', () => {
  assert.equal(searchNextAction(blankState(), now).step, 1);
  const state = ready(); assert.equal(searchNextAction(state, now).step, 8);
  state.jobs = [job('first'), job('second')];
  assert.equal(searchNextAction(state, now).jobId, 'first');
  assert.equal(searchNextAction(state, now).step, 5);
  state.jobs[0].status = 'closed'; assert.equal(searchNextAction(state, now).jobId, 'second');
  state.jobs[1].progress = cleanProgress({ stage: 'rejected', appliedAt: '2026-10-01' });
  assert.equal(searchNextAction(state, now).step, 8);
});
test('nearest valid upcoming interview is prioritised without counting it as completed', () => {
  const state = ready();
  state.jobs = [job('later', { stage: 'applied', appliedAt: '2026-10-01', scheduledAt: '2026-10-28' }), job('sooner', { stage: 'applied', appliedAt: '2026-10-01', scheduledAt: '2026-10-23' }), job('invalid', { scheduledAt: '2026-10-22' }), job('rejected', { stage: 'rejected', appliedAt: '2026-10-01', scheduledAt: '2026-10-22' })];
  assert.deepEqual(upcomingInterviews(state, now).map(j => j.id), ['sooner', 'later']);
  assert.equal(searchNextAction(state, now).jobId, 'sooner'); assert.equal(searchNextAction(state, now).step, 10);
  assert.equal(diagnose(state, now).interviews, 0);
  state.profile.currentRole = ''; assert.equal(searchNextAction(state, now).step, 10);
});
test('due follow-ups and unrecorded scheduled interviews open the correct tracker', () => {
  const state = ready(); state.jobs = [job('due', { stage: 'applied', appliedAt: '2026-10-01', nextAt: '2026-10-21', nextAction: 'Check the employer timeline' })];
  assert.equal(searchNextAction(state, now).step, 5); assert.equal(searchNextAction(state, now).jobId, 'due');
  state.jobs[0].progress = cleanProgress({ stage: 'applied', appliedAt: '2026-10-01', scheduledAt: '2026-10-20' });
  assert.equal(searchNextAction(state, now).step, 5);
  state.jobs[0].progress = cleanProgress({ stage: 'interview', appliedAt: '2026-10-01', scheduledAt: '2026-10-20', interviewAt: '2026-10-20' });
  assert.equal(searchNextAction(state, now).step, 8);
});
test('scheduled interviews validate dates, survive whitelist restoration and default safely on old data', () => {
  assert.equal(cleanProgress({}).scheduledAt, ''); assert.equal(cleanProgress({ scheduledAt: '2026-02-30' }).scheduledAt, '');
  assert.match(progressError(cleanProgress({ scheduledAt: '2026-10-23' })), /application date/);
  assert.match(progressError(cleanProgress({ stage: 'applied', appliedAt: '2026-10-01', scheduledAt: '2026-09-30' })), /application date/);
  const state = ready(); state.jobs = [job('upcoming', { stage: 'applied', appliedAt: '2026-10-01', scheduledAt: '2026-10-23' })];
  assert.equal(restoreState(serialiseState(state)).jobs[0].progress.scheduledAt, '2026-10-23');
});
