# GATIVX Quality & Delivery Control Tower

**Purpose:** Internal engineering/operations dashboard for accuracy, implementation progress and production output monitoring.
**Product boundary:** This is an internal quality dashboard. It does not replace, redesign or change the locked member-facing GATIVX dashboard.
**Status:** Specification and backlog prepared; runtime dashboard and telemetry are not yet implemented.

## 1. Dashboard principles

- Evidence before status: every status links to a commit, test run, artifact, device-test record or verified production signal.
- No invented percentages. Show numerator/denominator and evidence coverage; show **Unknown / Not measured** when no trustworthy data exists.
- Separate code inspection, implementation, automated test, integration test, physical-device test and production verification.
- Show the last successful data timestamp, source, freshness and failed/late collection state.
- A green CI build is not proof of physical-device operation, HealthKit/Health Connect access, workout persistence or production correctness.
- Internal monitoring must never expose member health data, precise GPS routes, tokens, credentials or personal identifiers.
- Preserve the GATIVX member dashboard's locked design and its existing data semantics.

## 2. Three dashboard workspaces

### A. Accuracy & Data Integrity

Show each metric and source independently:
- Steps, distance, pace, active energy, workout duration, elevation, heart activity, sleep, hydration, nutrition and weight.
- Source/provider and device/platform; measured, imported, member-reported or estimated classification.
- Source record count, accepted/rejected/duplicate/unresolved count.
- Event time, ingestion time, last successful sync and freshness.
- Permission state and source availability; distinguish denied, unavailable, stale, empty and zero.
- Reconciliation outcomes: exact duplicate removed, overlapping interval unresolved, selected source, late-arriving record.
- Calculation/method version for derived values; never label estimated calories/distance as measured.
- Per-source agreement only when comparable records/time windows exist; show difference and method, not a generic accuracy score.
- Data quality incidents: missing provenance, impossible values, stale feed, duplicate clumping, cross-device conflict, missing target consent, workout save failure.

**Rules:** Never fabricate zeroes, merge incomparable windows, infer Heart Points from steps/calories, or infer elevation without quality-controlled altitude. A missing target is not a failed user goal. Show **Not enough comparable data** rather than an accuracy percentage where no validated ground truth exists.

### B. Implementation & Release Readiness

Track work items by platform and capability:
- Web/PWA, iOS native, Android native, Supabase/backend, GURU and shared services.
- States: Not inspected, Inspected, In progress, Implemented, Unit-tested, Integration-tested, Device-tested, Production-verified, Blocked.
- Each transition requires evidence: PR/commit, test run and result, test artifact, device/OS, tester and timestamp.
- Display completed/total only for a defined scope and denominator. Do not use subjective project-wide completion percentages.
- Surface open blockers, failed checks, unreviewed PRs, stale branches, deployment status and outstanding release gates.
- Keep build success, app installation, runtime feature success and production deployment as distinct states.

### C. Output & Runtime Monitoring

Monitor operational outcomes without collecting sensitive member content:
- Authentication: sign-in success/failure counts, OTP/password recovery errors where applicable, session expiry, account isolation test result.
- Sync: queued, sent, acknowledged, retried, permanently failed, conflict/unresolved counts; oldest queue age; last successful sync.
- Workouts: start/finish/save success, save failure, route persistence and duplicate session rate.
- Health integrations: permission granted/denied/limited, read/write attempt outcomes, platform error category; never expose raw health records in operations view.
- App health: crash-free sessions, uncaught errors, API error rate/latency, app version, platform and OS version.
- Deployments: current production commit, deployment timestamp, health-check status, rollback event.
- Guru: response latency/error rate, safety refusal/escalation test outcomes and provider availability; do not log full prompts, chat transcripts or health context by default.
- Recovery Mode: check-in/save failures, clinician-plan tracking failures, consent/access audit events; never claim clinical effectiveness.

Every chart must show time range, event definition, numerator/denominator where relevant, aggregation and last event timestamp. Low-volume data must show sample size and avoid misleading percentages. Operational alerts should identify severity, affected component, first/last seen, linked evidence and owner.

## 3. Shared status vocabulary

- **PASS:** required check ran and passed with linked evidence.
- **FAIL:** check ran and failed with linked evidence.
- **BLOCKED:** cannot run due to a known dependency or access limitation.
- **NOT RUN:** no execution evidence.
- **STALE:** evidence exists but is outside its defined freshness window.
- **UNKNOWN:** no reliable state can be established.

Never map NOT RUN, BLOCKED, STALE or UNKNOWN to PASS.

## 4. Data model / telemetry contract

Use an internal, privacy-minimised event schema:
- event_id (idempotency key), event_name, schema_version
- occurred_at, recorded_at
- environment (local/test/staging/production)
- app_version, platform, OS_version
- component, operation, outcome
- error_code/category (sanitised; no secrets or free-text health content)
- correlation_id (random, non-member-identifying)
- evidence_url/commit/test_run_id where appropriate
- duration_ms and retry_count where applicable

For member activity data, the product data store remains the source of truth; this monitoring layer stores aggregate operational counters and sanitised error categories only. Never duplicate raw health data or GPS traces into analytics/monitoring.

## 5. Alerts and incident handling

- P0: suspected data exposure, cross-account access, corrupted/lost member records, widespread inability to save workouts, or unsafe medical output.
- P1: major platform integration failure, sync backlog growing beyond defined threshold, elevated auth failure, production crash spike.
- P2: isolated feature failure, degraded latency, stale noncritical telemetry.
- P3: cosmetic or low-impact reporting defect.

Thresholds must be calibrated from observed baseline; do not invent alert thresholds before collecting baseline data. Every alert includes runbook/action, affected version/platform, time window and evidence. Acknowledge, investigate, mitigate, verify and record root cause.

## 6. Release gates

Release is blocked if any of these are true:
- Critical/high data-integrity or privacy defect remains open.
- Any platform build/test required for the release is failing or not run.
- Physical-device tests for required sensors, background tracking, health permissions, workout save and sync are missing.
- Cross-account isolation or RLS verification fails.
- Workout save/persistence has unresolved failures.
- A member-facing metric can silently substitute estimates for measurements or display missing data as zero.
- Safety tests for GURU/recovery flows fail.
- Production deployment or rollback verification is absent.

A release report must list exact commit, artifacts, workflow runs, device/OS matrix, test counts, failures, blockers and deployment URL/commit. Never claim launch-ready based on CI alone.

## 7. Acceptance criteria

1. Accuracy workspace displays provenance, freshness, measurement class, reconciliation and quality exceptions.
2. Implementation workspace shows evidence-backed per-platform states and explicit denominators.
3. Output workspace shows sanitised operational metrics, error categories and sync/workout outcomes.
4. Unknown, stale, blocked and not-run are visually distinct from pass/zero.
5. Sensitive member health data, GPS route points, secrets and raw chat content are excluded.
6. Every status/alert can be traced to evidence and time.
7. Automated tests validate event schema, redaction, idempotency, aggregation and alert transitions.
8. Dashboards are tested against synthetic fixtures in test environments only; no fixture data reaches production.
9. Access is restricted to authorised engineering/operations roles and audited.
10. No changes to the locked member-facing dashboard without explicit founder approval.

## 8. Current verified baseline (24 Nov 2026)

- Web workflow validates JavaScript syntax and patch whitespace; this is not a full web UI/integration suite.
- Android workflow runs unit tests and assembles a debug APK; no physical-device acceptance is implied.
- iOS workflow compiles simulator/device targets and packages unsigned artifacts; this does not establish signed installation, HealthKit runtime access or physical iPhone success.
- Pages deployment workflow runs on push to main or manual dispatch; a pull-request workflow success is not a production deployment.
- PR #12 reconciliation core has a reported 9/9 unit-test pass, but it is not yet connected to native ingestion, health providers or production services.
- Existing app baseline has known silent target defaults and estimated metric paths requiring correction before accuracy acceptance.
- Therefore current implementation/production telemetry coverage is **Not measured / incomplete**, not a percentage.

