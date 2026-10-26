import { hasCompanyResearch } from './company-research.mjs';
import { contextQuestions } from './interview-context.mjs';
// Editorial practice prompts, not questions obtained from an employer.
// Keys follow the existing role library; no inferred candidate qualifications.
export const ROLE_QUESTIONS = {
  'release-manager': [
    ['How do you decide whether a release is ready to proceed?', 'Explain readiness evidence, dependencies, approvals and who owns the go/no-go decision.'],
    ['Tell me about a release that needed to be delayed or rolled back.', 'Describe the risk, communication, recovery plan and what you learned; use an example you actually experienced.'],
    ['How would you coordinate releases across several teams?', 'Discuss scheduling, conflicting dependencies, environments and transparent ownership.']
  ],
  'it-change-manager': [
    ['How would you assess a proposed technology change?', 'Cover impact, risk, testing, recovery and appropriate approval authority.'],
    ['How would you handle an emergency change?', 'Explain proportionate controls, communication and follow-up review without assuming every organisation uses the same process.'],
    ['Tell me about improving an IT change process.', 'Describe the evidence, your contribution and how you balanced safety with delivery speed.']
  ],
  'technical-delivery-manager': [
    ['How do you manage dependencies between engineering teams?', 'Explain owners, visibility, prioritisation and escalation with a real example.'],
    ['Tell me about a difficult technical delivery trade-off.', 'Separate your coordination responsibility from architecture decisions owned by others.'],
    ['How would you communicate a delivery forecast that has changed?', 'Describe uncertainty, options and how you would agree priorities with stakeholders.']
  ],
  'operations-manager': [
    ['How would you identify the most important operational improvement?', 'Explain service measures, constraints and how you would check the effect of a change.'],
    ['Tell me about balancing people, service quality and cost.', 'Describe your actual authority and the trade-offs without inventing financial results.'],
    ['How would you handle a serious disruption to daily operations?', 'Cover immediate priorities, communication, recovery and lessons learned.']
  ],
  'project-manager': [
    ['How do you establish a realistic project plan?', 'Discuss scope, assumptions, estimates, dependencies and agreement with the delivery team.'],
    ['Tell me about a project whose scope or budget changed.', 'Explain how you assessed the impact and obtained the necessary decisions.'],
    ['How would you manage a major delivery risk?', 'Describe evidence, ownership, mitigation and when you would escalate.']
  ],
  'service-delivery-coordinator': [
    ['How would you handle an urgent service request involving several teams?', 'Explain ownership, prioritisation, updates and how you would confirm resolution.'],
    ['Tell me about a service escalation you helped resolve.', 'Separate your actions from the team’s work and describe the outcome you can substantiate.'],
    ['Which service measures would you track, and how would you use them?', 'Discuss response time, backlog or quality only where relevant; explain the trade-offs.']
  ],
  'operations-coordinator': [
    ['Tell me about a process you kept running when priorities changed.', 'Describe the constraint, your decision and the effect on day-to-day work.'],
    ['How would you investigate a recurring operational delay?', 'Explain how you would map the process, check evidence and test an improvement.'],
    ['How do you make operational records reliable?', 'Prepare an example of checking accuracy, handling exceptions and following up.']
  ],
  'project-coordinator': [
    ['How would you track actions and dependencies against a deadline?', 'Explain owners, dates, updates and escalation; do not claim a delivery method you have not used.'],
    ['Tell me about a time a project task was at risk of slipping.', 'Show how you spotted the risk and communicated options.'],
    ['How would you keep project stakeholders informed?', 'Explain what different audiences need, the reporting cadence and how decisions are recorded.']
  ],
  'customer-success-associate': [
    ['How would you help a new customer get value from a product?', 'Describe discovery, onboarding steps and how you would check progress.'],
    ['What would you do if a customer was disengaged or unhappy?', 'Explain listening, investigating and agreeing a next step without promising outcomes you cannot control.'],
    ['Tell me about a customer relationship you helped improve.', 'Be clear about whether you owned support, renewals or sales; use only your actual responsibilities.']
  ],
  'sales-support-coordinator': [
    ['How would you manage competing quotation or order requests?', 'Discuss urgency, accuracy, communication and follow-through.'],
    ['Tell me about a time you spotted an error in customer or sales information.', 'Explain how you checked and corrected it and prevented recurrence.'],
    ['How would you keep a CRM useful to the sales team?', 'Describe data quality and handovers; distinguish systems you have used from ones you would learn.']
  ],
  'training-coordinator': [
    ['How would you coordinate a training session with several stakeholders?', 'Cover scheduling, accessibility, materials, attendance and follow-up.'],
    ['Tell me about a time you helped someone learn a task.', 'Describe the learner’s need, your approach and how you checked understanding.'],
    ['How would you judge whether a training activity was useful?', 'Distinguish attendance, feedback and evidence of changed performance.']
  ],
  'recruitment-coordinator': [
    ['How would you coordinate interviews when diaries clash?', 'Explain priorities, candidate communication and accurate scheduling.'],
    ['How would you handle candidate information confidentially?', 'Discuss access, minimum necessary sharing and following the organisation’s retention policy.'],
    ['Tell me about a time you kept people informed during a changing process.', 'Prepare a clear example of managing expectations without making promises you could not keep.']
  ],
  'administrative-coordinator': [
    ['How do you organise competing administrative deadlines?', 'Explain a real method for tracking tasks, prioritising and checking completion.'],
    ['Tell me about a time you improved an administrative process.', 'Show the problem, your contribution and the result without inventing figures.'],
    ['How would you handle a sensitive request or record?', 'Discuss accuracy, appropriate access and when to seek guidance.']
  ],
  'reporting-analyst': [
    ['How would you check a report before sharing it?', 'Explain source checks, reconciliations, anomalies and limitations.'],
    ['Tell me about a time you turned data into a useful explanation.', 'Connect the audience’s question to your analysis and the decision it supported.'],
    ['What would you do if two reports showed different figures?', 'Discuss definitions, time periods, data lineage and testing possible causes.']
  ],
  'workforce-scheduler': [
    ['How would you adjust a rota after unexpected absence?', 'Discuss coverage, skills, working-time constraints and communication.'],
    ['Tell me about a time you balanced competing scheduling needs.', 'Explain the trade-offs and how you treated people fairly.'],
    ['How would you check whether staffing matched demand?', 'Explain the information you would review and when to escalate a gap.']
  ],
  'logistics-coordinator': [
    ['How would you handle a delayed delivery affecting a customer?', 'Explain verification, options, communication and follow-through.'],
    ['Tell me about a time you kept stock or shipment records accurate.', 'Use a real example, or explain an honest transferable approach if this is new to you.'],
    ['How would you prioritise several urgent logistics issues?', 'Discuss impact, dependencies, safety and who needs to make the decision.']
  ],
  'customer-support-lead': [
    ['Tell me about a time you coached someone through a performance issue.', 'Explain expectations, listening, support and how you checked improvement.'],
    ['How would you balance customer service quality with a growing queue?', 'Discuss triage, team capacity and which measures you would watch.'],
    ['How would you handle a difficult escalation while supporting the team?', 'Explain ownership, boundaries, communication and the learning afterwards.']
  ]
};
export function interviewQuestions(job, pack) {
  const questions = [
    { id: 'introduction', question: `What experience would you bring to the ${job.title} role?`, guidance: 'Give a brief overview, then connect two truthful examples to the advert. Do not recite your whole CV.' },
    { id: 'motivation', question: `Why are you interested in this role${job.employer ? ` at ${job.employer}` : ''}?`, guidance: 'Research the employer independently. Connect the work to your interests without inventing facts about the organisation.' },
    { id: 'challenge', question: 'Tell me about a difficult situation at work and what you learned.', guidance: 'Use Situation, Task, Action and Result (STAR). Be clear about your own actions and what you would do differently.' }
  ];
  (ROLE_QUESTIONS[pack.roleId] || []).forEach(([question, guidance], i) => questions.push({ id: `${pack.roleId}-${i}`, question, guidance }));
  pack.focus.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3).forEach((requirement, i) => questions.push({ id: `requirement-${i}`, question: `What example can you give for this requirement: “${requirement}”?`, guidance: 'Identify what you actually did, the outcome you can support and any gap you need to discuss honestly. This is a practice prompt based on the text you chose.' }));
  if (hasCompanyResearch(pack)) questions.push({ id: 'company-knowledge', question: `What do you know about ${job.employer || 'our company'}, and why would you like to work here?`, guidance: 'Use the company research you supplied. Cover what the company does, who it serves and one current priority you have checked. Explain why it matters to this role and to you. A URL alone is not research; verify missing facts before practising.' });
  questions.push(...contextQuestions(pack));
  questions.push({ id: 'closing', question: 'What would you like to ask us?', guidance: 'Ask about first-90-day priorities, how success is measured, support for learning and any unclear working conditions.' });
  return questions;
}
