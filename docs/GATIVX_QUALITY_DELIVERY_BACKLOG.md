# GATIVX Quality & Delivery Control Tower — Engineering Backlog

**Status:** Ready for implementation planning; runtime dashboards/telemetry not yet implemented.
**Scope:** Internal quality dashboard only; preserve locked member-facing GATIVX dashboard.

## Epic QD-01 — Evidence registry and implementation status
- [ ] Define canonical work-item schema and allowed status transitions.
- [ ] Store platform/component, commit/PR, test-run evidence, artifact, device/OS, tester, timestamp and blocker.
- [ ] Calculate completion only from explicit scope denominator; show evidence coverage separately.
- [ ] Distinguish PASS, FAIL, BLOCKED, NOT RUN, STALE and UNKNOWN.
- [ ] Import GitHub PR/workflow/deployment evidence with read-only least-privilege access.

## Epic QD-02 — Accuracy & Data Integrity workspace
- [ ] Metric provenance and measured/imported/member-reported/estimated labels.
- [ ] Freshness, permission and source availability states.
- [ ] Duplicate, overlap, unresolved conflict and late-arrival counters.
- [ ] Source agreement only for comparable windows and validated references.
- [ ] Quality exception register: missing provenance, stale data, duplicate clumping, cross-device conflicts, invalid values, target defaults and workout save failures.
- [ ] Add test coverage for missing/stale/denied/conflicting data; no fabricated zeroes.

## Epic QD-03 — Sanitised operational telemetry
- [ ] Implement versioned, idempotent event contract.
- [ ] Instrument auth, sync queue, workout lifecycle/save, health provider read/write outcomes, crashes/API errors, deployment and Guru safety outcomes.
- [ ] Redact tokens, identifiers, GPS traces, health values and chat content.
- [ ] Aggregate counters/latency/error categories; set retention and access policy.
- [ ] Establish baseline before setting alert thresholds.

## Epic QD-04 — Output monitoring and alerting
- [ ] Sync queue depth/age/retries/failures/conflicts.
- [ ] Workout start/finish/save outcomes and persistence verification.
- [ ] Health permission and provider operation outcomes.
- [ ] Crash-free sessions, API error rate/latency and app version breakdown.
- [ ] Deployment commit/time/health check/rollback state.
- [ ] Guru latency/provider errors/safety test results without raw transcript logging.
- [ ] Alert severity, evidence, owner, acknowledgement and runbook.

## Epic QD-05 — Control Tower UI and access
- [ ] Build three internal views: Accuracy, Implementation, Output Monitoring.
- [ ] Filters: date range, environment, app version, platform, component and severity.
- [ ] Evidence drill-down to PR/commit/workflow/artifact/test record.
- [ ] Restricted engineering/operations role; audit dashboard access.
- [ ] Responsive UI, accessible status semantics and empty/stale/error states.
- [ ] Do not modify the locked member dashboard or expose member PII/health data.

## Epic QD-06 — Quality gates and launch readiness
- [ ] CI schema/redaction/idempotency/aggregation tests.
- [ ] End-to-end tests with synthetic test-only events.
- [ ] Physical iPhone and Android acceptance evidence.
- [ ] Cross-account isolation and RLS verification.
- [ ] Workout persistence, offline queue recovery and sync conflict tests.
- [ ] Production deployment and rollback verification.
- [ ] Generate evidence-based release report; block release on unresolved critical gates.

## Required reporting
For every checkpoint: Inspected / Changed / Tests passed / Tests failed / Blockers / Next concrete action. Never report a percentage without a defined denominator. Never treat CI compile success as device or production success.
