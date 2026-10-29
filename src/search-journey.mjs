import { cleanProgress, progressError } from './progress-model.mjs';
import { assessJob } from './matching.mjs';

const active = job => !['offer', 'rejected', 'withdrawn'].includes(job.progress?.stage);
export function upcomingInterviews(state, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  return state.jobs.filter(job => {
    const p = cleanProgress(job.progress);
    return active(job) && p.scheduledAt >= today && !progressError(p, today);
  }).sort((a, b) => a.progress.scheduledAt.localeCompare(b.progress.scheduledAt));
}
export function searchNextAction(state, now = Date.now()) {
  const interview = upcomingInterviews(state, now)[0];
  if (interview) return {
    title: `Prepare for your ${interview.title} interview`, detail: `Scheduled for ${interview.progress.scheduledAt}. Add your screening-call notes and download your preparation pack.`, action: 'Prepare for this interview', step: 10, jobId: interview.id
  };
  const today = new Date(now).toISOString().slice(0, 10);
  const due = state.jobs.filter(job => active(job) && !progressError(cleanProgress(job.progress), today) && ((job.progress?.nextAt && job.progress.nextAt <= today) || (job.progress?.scheduledAt && job.progress.scheduledAt < today && job.progress.scheduledAt > (job.progress.interviewAt || '')))).sort((a, b) => (a.progress.nextAt || a.progress.scheduledAt).localeCompare(b.progress.nextAt || b.progress.scheduledAt))[0];
  if (due) return { title: `Check in on ${due.title}`, detail: due.progress.nextAction || 'Review what happened and update this application. A scheduled interview does not count as a completed interview.', action: 'Update this application', step: 5, jobId: due.id };
  if (!state.profile.currentRole.trim() || state.profile.evidence.trim().length < 20) return {
    title: 'Start with your experience', detail: 'Upload your CV or enter a short profile, then review the details.', action: 'Complete my profile', step: 1
  };
  const job = state.jobs.find(job => cleanProgress(job.progress).stage === 'saved' && assessJob(state.profile, job, now).status !== 'skip');
  if (job) return { title: `Decide your next move for ${job.title}`, detail: 'Check the job match and full advert. When you apply or hear back, record it here. Interview preparation is available whenever you need it.', action: 'Update this job', step: 5, jobId: job.id };
  return { title: 'Find your next suitable job', detail: 'Explore vacancies for your target role, or bring an advert you have already found. Keep recording responses on your saved jobs below.', action: 'Find suitable jobs', step: 8 };
}
