# GATIVX Recovery Mode — Engineering Backlog

**Status:** Approved product scope; implementation not yet started.
**Product owner decision:** Include Everyday Recovery, Sports Recovery and Clinical Rehabilitation Tracking as one permanent GURU capability.

## Epic REC-01 — Recovery data foundation
- [ ] Define recovery check-in schema: date/time, body area, soreness, stiffness, fatigue, perceived exertion, mobility limitation, member notes.
- [ ] Store origin/provenance, consent, timestamps, freshness and edit history for every recovery datum.
- [ ] Add member-level access controls; rehab notes are private by default.
- [ ] Define retention, export and deletion behaviour for recovery data.
- [ ] Never derive diagnosis, tissue healing or clinical status from self-report or wearables.

## Epic REC-02 — Everyday Recovery
- [ ] Daily recovery check-in with optional fields and Unknown/Not reported states.
- [ ] General low-risk recovery education and accessible mobility suggestions.
- [ ] Adapt suggestions to declared restrictions; pause suggestions when safety is unclear.
- [ ] Allow member to report intolerance, worsening symptoms or choose rest.

## Epic REC-03 — Sports Recovery
- [ ] Training history and training-load context using validated activity records.
- [ ] Member-reported exertion, fatigue and soreness trends.
- [ ] Recovery adherence and rest-day context.
- [ ] Any readiness summary must expose inputs, method, limitations and missing data; no unsupported score or injury prediction.
- [ ] No automatic return-to-play clearance or medical restriction based on wearable signals.

## Epic REC-04 — Clinical Rehabilitation Tracking
- [ ] Enter/import clinician-provided rehabilitation plan with provenance and clinician attribution where available.
- [ ] Track exercise instructions, sets, reps, duration, schedule, completion and tolerance.
- [ ] Prevent GURU from inventing or autonomously progressing a rehabilitation prescription.
- [ ] Track adherence and self-reported response without claiming healing.
- [ ] Prepare member-controlled, consent-based clinician summary/export.

## Epic REC-05 — GURU safety and escalation
- [ ] Safety profile treats unanswered limitations as Unknown.
- [ ] Medical-boundary prompt tests: diagnosis, treatment, medications, supplements, dosage and return-to-play.
- [ ] Worsening/persistent/function-limiting symptom escalation to qualified clinician.
- [ ] Emergency warning-sign tests direct to urgent/emergency care without delaying with questionnaires.
- [ ] No painful/aggressive self-treatment or forced stretching recommendations.

## Epic REC-06 — Product integration and QA
- [ ] Add Recovery Mode entry point without changing locked dashboard layout without approval.
- [ ] Add recovery summary and trends to Daily Debrief and reports only where data exists.
- [ ] Connect only consented, relevant activity/sleep data with source/freshness labels.
- [ ] Web, iOS and Android integration tests.
- [ ] Physical-device acceptance, permissions, offline behaviour and sync tests.
- [ ] Security/privacy review and recovery-data access tests.

## Release gates
- All safety tests pass.
- No fabricated or stale recovery metrics.
- Clinical rehabilitation content is member/clinician supplied, not AI-prescribed.
- Privacy and consent controls verified.
- Feature status reported separately as Inspected, Implemented, Unit-tested, Integration-tested and Device-tested.
