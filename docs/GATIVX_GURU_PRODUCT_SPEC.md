# GATIVX Guru — Product and Engineering Specification

**Status:** Founder-approved requirements; implementation and acceptance tests pending.  
**Main product:** GATIVX  
**Coaching companion:** GURU (member-facing identity; AI processing must be transparently disclosed).

## Product promise

GURU is a personalised wellness and fitness coach that helps a member understand their progress, stay consistent and adapt a sustainable plan towards meaningful goals. It is not a medical service or a substitute for a human healthcare professional.

## Member experiences

### On-demand daily progress
A member can request "Today's Progress So Far" at any time. The report must use the latest successfully synchronised data and show the last-updated time.

### Daily Debrief
Every daily debrief contains:
- A balanced status: Excellent progress, On track, Needs attention, or Insufficient reliable data.
- What went well and what was achieved.
- Where the member fell short of their own plan.
- What could improve, with a practical next action.
- A supportive message connected to the member's stated purpose.

A missed target must never be presented as a personal failure. Incomplete or unavailable data must not be interpreted as zero or poor performance.

### Periodic reports
Support Daily, Weekly, Fortnightly (14 days), Monthly, Quarterly, Yearly and Custom date ranges. Charts should cover activity, distance, pace, active energy, verified heart activity, consistency, weight trend, sleep, hydration, nutrition and goal progress where the relevant data exists. Selecting a chart point should reveal the underlying date, reading, source and quality.

### Goal trajectory and adaptive coaching
For a member-defined goal and timeframe, compare:
1. The member's agreed plan and milestones.
2. Observed progress based on valid readings.
3. Sustainable next steps.

Never promise an exact outcome or extrapolate a trajectory from insufficient data. Adapt recommendations using activity, strength training, sleep, recovery, adherence and member-reported fatigue/soreness. Rest is a valid part of progress; do not prescribe arbitrary rest periods from a single weak signal.

## Fitness Safety Profile

Before personalised exercise advice, obtain explicit, voluntary, minimal screening for limitations relevant to exercise. Areas may include diabetes/blood-sugar condition, high or low blood pressure, known heart condition, joint/mobility limitations, respiratory limitations, injury/recent surgery and clinician-imposed restrictions.

- Explain why each item is requested and obtain consent.
- An unanswered field is **Unknown**, never "No".
- Do not collect full medical history or emergency-contact details for this fitness feature.
- Ask only for information necessary to avoid unsuitable exercise recommendations.
- Revisit the profile when a member reports a new condition, injury, symptom or restriction.
- Use member-reported clinician restrictions; do not diagnose or medically risk-score the member.

## Medical boundary

GURU may provide general fitness, movement, recovery and healthy-habit education. It must not diagnose, treat, prescribe medication/supplements/dosages, recommend changing or stopping prescribed treatment, interpret symptoms as a diagnosis, or claim to provide emergency care.

When a request requires medical judgement, say that GURU cannot provide medical advice and direct the member to a qualified healthcare professional. For potentially urgent symptoms, advise urgent medical help. Pause the affected exercise recommendation when safety is unclear.

GURU may be the member-facing coaching identity, but must not falsely claim to be human or conceal that AI processes the conversation. Disclose the AI provider/processing and relevant data use in onboarding/privacy information.

## Data integrity: no fabricated defaults

- No dummy, seeded, fabricated or appearance-driven production readings.
- No silent zeroes for missing permissions, missing records, stale sync or unavailable sources.
- Every metric must carry source/provenance, measurement time, freshness, measured-versus-estimated status, calculation method/version and quality/confidence where appropriate.
- Prefer reliable platform/device measurements. Label estimates and never overwrite measured data with estimates.
- Do not infer genuine Heart Points from steps or calories. Use a documented source or validated intensity-minute method and label the result accurately.
- Calculate elevation gain only from a quality-controlled altitude source with filtering; otherwise show unavailable.
- A height-derived stride is an estimate only. Calibrate from valid measured distance/steps when possible and never override a reliable health-platform distance.
- Prevent duplicate ingestion, double counting, stale records and cross-device overwrites.
- A goal/target must be explicitly chosen by the member or transparently proposed and accepted. Do not silently insert default targets.

## Technical architecture

GATIVX deterministic data services calculate, validate and reconcile readings. The AI layer interprets only the minimum necessary, consented context and produces conversational explanations/coaching. AI must not invent measurements or independently calculate unsupported medical risk.

Any AI integration must be server-side; API keys must never be shipped in the web, iOS or Android client. Apply consent, access control, data minimisation, secure transport, retention controls and auditable safety tests. Do not send health-related data to an AI provider without clear disclosure and appropriate consent.

## Acceptance gates

1. Unit tests for formulas, provenance, freshness, missing/denied permissions, estimates and duplicate prevention.
2. Safety tests for medical/medication requests, unknown screening answers, declared limitations, concerning symptoms and emergency language.
3. Golden conversation tests for daily debrief, daily/weekly/fortnightly/monthly reports, goal trajectory and recovery coaching.
4. Reconcile every chart/report total to its underlying source records.
5. Web, iOS and Android integration tests plus physical-device acceptance for sensor, background, health permission, workout persistence and sync behaviour.
6. Track each item as Inspected / Implemented / Unit-tested / Integration-tested / Device-tested. No release-ready claim without evidence.

## Existing implementation audit findings (24 Nov 2026)

The audited development baseline contains logic that must be corrected before it can meet the no-defaults promise:
- `memberTargets()` silently synthesises step, calorie and distance goals (including a 5,000 m fallback).
- Dashboard markup displays fixed target examples such as 8,000 steps, 5 km and 300 kcal.
- Distance can fall back to a height-derived stride estimate; this must be explicitly labelled and must not masquerade as measured distance.
- Calorie estimates use a simple weight × distance × 0.5 formula; this needs scientific review, validation and clear estimate labelling before use in coaching.
- The displayed "heart" ring is exercise minutes, not verified Heart Points. The label and calculation must not imply otherwise.
- A dedicated Guru module currently uses localStorage check-ins and generic mood prompts; it is not yet connected to verified activity, goal trajectory, reporting, fitness safety screening or AI conversation.

These are audit findings, not claims that the corrections have already been implemented.


## GATIVX Recovery Mode — Everyday, Sports and Clinical Rehabilitation

**Product decision:** Approved for all three recovery levels as a permanent GURU capability within GATIVX, not a separate application. This approval establishes product scope; it does not mean clinical services or recovery recommendations are already implemented.

### Purpose and member groups

Recovery Mode supports:
1. **Everyday Recovery:** general members, walkers and people building sustainable fitness habits.
2. **Sports Recovery:** runners, cyclists, gym-goers, recreational and competitive athletes.
3. **Clinical Rehabilitation Tracking:** members following a plan prescribed or approved by a qualified physiotherapist or other treating clinician.

### Core capabilities

- Daily recovery check-in: member-reported soreness, stiffness, fatigue, perceived exertion, mobility limitations and affected body area. Pain and symptoms are self-reports, not diagnoses.
- Recovery context: show relevant recent activity/training load, sleep and rest information only when valid, consented and sufficiently fresh. Clearly distinguish measured, imported and member-reported data.
- Recovery guidance: general education and low-risk recovery habits, mobility and flexibility suggestions within the member's declared limitations. Do not label generic suggestions as a clinical prescription.
- Sports recovery: training-session history, perceived effort, soreness/fatigue trends, recovery adherence and workload context. No unsupported readiness score or injury prediction.
- Rehabilitation plan tracking: record clinician-provided exercise names/instructions, sets/repetitions/duration, schedule, completion, tolerance and member notes. The member or clinician supplies the plan; GURU does not invent a rehabilitation protocol.
- Progress review: show trends and adherence over time, with gaps and uncertainty visible. A change in a self-reported score is not proof of tissue healing or clinical recovery.
- Clinician handoff: allow the member to prepare a concise export/summary of their reported symptoms, activity and rehab adherence for their treating professional, subject to explicit consent and privacy controls.

### Recovery decision and coaching boundaries

GURU may offer non-clinical options such as normal planned activity, lighter activity, recovery habits or rest when supported by the available context. It must explain uncertainty and let the member choose. It must not clear an athlete to return to sport, diagnose an injury, estimate tissue healing, prescribe or progress a rehab protocol, or replace an in-person assessment.

Clinical rehabilitation plans must be entered by the member from clinician instructions or supplied/approved by a verified treating professional. Any exercise modifications, load progression, return-to-play decision or treatment recommendation require the treating clinician's direction.

### Safety and escalation

- Screen for relevant declared limitations and restrictions; unknown or unanswered remains **Unknown**, never assumed safe.
- Ask about new injury, recent surgery, clinician restrictions and relevant symptoms before suggesting movement where appropriate.
- Stop the affected activity suggestion and advise prompt assessment by a qualified healthcare professional for new, worsening, persistent or function-limiting symptoms.
- For emergency warning signs (for example chest pain, fainting, severe breathing difficulty, major trauma, sudden weakness/numbness, or suspected serious fracture), advise stopping exercise and seeking urgent/emergency medical help. Do not attempt remote triage or delay care with a questionnaire.
- Do not provide diagnosis, treatment, medication/supplement prescription, dosage advice, or instructions to start/stop/change prescribed care.
- Recovery suggestions must be conservative, accessible and adapted to stated limitations; no forced stretching, painful movements or aggressive self-treatment.
- Do not use wearable-derived sleep/HR/HRV or a single readiness score to medically clear or restrict an athlete. Explain source and limitations.

### Privacy and consent

Recovery check-ins and rehabilitation notes may contain sensitive health information. Collect the minimum necessary, explain use, obtain explicit consent, apply member-level access controls, protect exports, and provide retention/deletion controls. Do not share rehabilitation details with family, coaches or teams by default.

### Acceptance criteria

1. Everyday, Sports and Clinical Rehabilitation modes are available as distinct experiences within one Recovery Mode.
2. No recovery/readiness value is fabricated when inputs are missing, stale, denied or conflicting.
3. All displayed inputs show provenance, freshness and whether they are measured, imported or member-reported.
4. A clinician plan is distinguishable from general GURU suggestions; plan changes require clinician direction.
5. Symptom escalation and emergency-language safety tests pass; no diagnosis or return-to-play clearance is generated.
6. Member can pause or stop suggestions and record intolerance or worsening symptoms.
7. Rehab adherence reports do not claim healing or clinical outcome.
8. Consent, access, export, retention and deletion controls are tested.
9. Web, iOS and Android flows pass integration tests; physical-device testing validates health-data permissions and sync.
10. Each feature is tracked as Inspected / Implemented / Unit-tested / Integration-tested / Device-tested. Do not claim release readiness without evidence.
