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
