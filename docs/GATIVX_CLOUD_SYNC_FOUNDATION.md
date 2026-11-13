# GATIVX Cloud Identity, Sync & Scale Foundation

Status: approved product architecture
Target: design for 1,000,000 registered accounts; scale infrastructure according to measured use.
Date: 2026-11-13

## Non-negotiable product principles
1. A member's data belongs to the member, not to a device or operating system.
2. iOS, Android, and browser clients use one GATIVX identity and one canonical cloud history.
3. The cloud is the durable source of truth. Device storage is a local cache and offline outbox.
4. Never fabricate health measurements. Every measurement retains its source and observation time.
5. Synchronization must be idempotent, resumable, observable, and safe under retries.
6. Build for growth without paying for unused capacity. One-million-account readiness is an architecture goal, not a claim that one small database instance can serve one million concurrent users.

## System shape
- iOS native client: HealthKit/Core Motion permissions and collection, native background delivery where the OS permits it, GPS during explicitly started workouts.
- Android native client: Health Connect and platform step sensors, foreground/background services subject to OS permissions and policy, GPS during explicitly started workouts.
- Web client: account access, history, goals, analytics, export and GURU; browser APIs are not a substitute for native HealthKit/Health Connect collection.
- Supabase: Auth, Postgres, private object storage when needed, and narrowly scoped server-side functions.
- All clients call the same authenticated API and read the same canonical records.

## Canonical data model (logical)
Every user-owned row carries user_id, server timestamps, and a stable client-generated id or client_id.
- profiles: account profile and preferences.
- goals: purpose, target, dates, progress configuration.
- activities: workouts and activity sessions (duration, distance, route reference, start/end, source).
- daily_metrics: one row per user, local calendar date, metric type and source; e.g. steps. Preserve source provenance and avoid merging incompatible provider totals blindly.
- health_samples (only if needed): time-bounded observations with metric, value, unit, source, observed_at, timezone and provider record identifier. Do not upload raw high-frequency sensor streams by default.
- device_installations: opaque installation identifier, platform, app version, last sync time and revocable device status. Never use this as the user's identity.
- sync_receipts: idempotency key, user, source installation, received time and processing outcome.
- guru_insights: user-owned coaching history and the minimal context required to explain recommendations.

Prefer daily aggregates for step counts and workout summaries. Store GPS route points only for an explicitly started workout; consider compressed route payloads or private object storage for larger tracks. Avoid storing continuous all-day location.

## Identity, privacy and security
- Supabase Auth is the identity provider; email/password and optional OAuth providers map to the same immutable auth user ID.
- Never use an email address, Google account ID, Apple ID, or device ID as the primary data key.
- Enable RLS on every exposed user-data table. Policies must scope SELECT/INSERT/UPDATE/DELETE to auth.uid() = user_id; UPDATE also requires a matching WITH CHECK. Validate ownership for related objects and storage paths.
- Keep service-role/secret keys exclusively on trusted servers. Mobile and web clients use publishable keys plus the signed-in user's session.
- Minimize health data collection, request only the permissions needed for enabled features, explain data use, and provide export and account deletion workflows.
- Use TLS in transit, managed encryption at rest, secret rotation, short-lived signed URLs for private files, and audit logs for privileged operations.
- Backups are not a substitute for tested restores. Define recovery-point and recovery-time objectives before public launch.

## Synchronization contract
1. Each client writes new events to a durable local outbox before reporting them as saved.
2. Every event has a stable UUID idempotency key generated once on the device; retries reuse it.
3. Upload in bounded batches with exponential backoff and jitter. Resume after reconnect, app launch, and foregrounding.
4. Server validates auth, ownership, schema, source, units, timestamps and payload size before upsert.
5. The server acknowledges each idempotency key only after durable commit. Clients remove only acknowledged items from the outbox.
6. Pull changes using a server-issued cursor or updated-at watermark with an overlap window; deduplicate by canonical ID. Do not rely only on device clocks.
7. Reconcile aggregates by explicit metric/source policy. Never add overlapping HealthKit, Health Connect and manual daily totals together. Keep source-specific observations and choose a displayed canonical total deterministically.
8. Resolve mutable profile/goal conflicts with server versions and explicit last-write/version rules. Immutable workout events should not be silently overwritten.
9. Surface sync state (last successful sync, queued count, last error) to the member and provide retry diagnostics without exposing private data.

## Scale and cost controls
- Start on the existing Supabase project and measure real workload before upgrading compute.
- Index user-scoped access patterns, especially (user_id, activity_date DESC), (user_id, metric_date, metric_type, source), and unique idempotency keys.
- Paginate history; never load a member's entire lifetime history in one request.
- Keep large binary/route payloads out of hot relational rows when size justifies private object storage.
- Use connection pooling, bounded batch sizes, query plans, rate limits, and load tests.
- Define operational thresholds for database size, CPU, memory, I/O, egress, storage and backup duration. Scale vertically first where appropriate, then partition/archive high-volume tables only when measured evidence justifies it.
- One million registered accounts does not mean one million concurrent users. Capacity planning must use active users, writes/second, read patterns, retention and payload sizes.

## Delivery sequence and acceptance criteria
### Phase 1 — Cloud contract and security
- Inspect the live schema, existing RLS policies, Auth settings, storage policies and migrations before changing anything.
- Agree canonical IDs, source vocabulary, date/timezone rules, sync API contract and provenance fields.
- Verify every exposed table has correct RLS and ownership checks with two test users.

### Phase 2 — Native-to-cloud ingestion
- Connect native iOS and Android clients to the same Supabase Auth identity.
- Upload real HealthKit/Core Motion and Health Connect/platform sensor aggregates with explicit source labels and observation dates.
- Keep offline records until server acknowledgement; retries create no duplicates.

### Phase 3 — Cross-client read and reconciliation
- Web, iOS and Android show the same cloud-backed history after signing into the same account.
- Test iPhone -> cloud -> browser -> Android and the reverse direction.
- Test new phone, reinstall, sign-out/sign-in, offline periods, timezone/day-boundary changes, duplicate retries and overlapping provider sources.

### Phase 4 — Reliability and scale
- Automated RLS isolation tests, sync contract tests, backup/restore drill, telemetry and cost alerts.
- Load-test representative active-user and write/read patterns before making any one-million-user capacity claim.

## Release gates
Do not claim synchronization is complete until a physical iPhone and Android device have uploaded genuine permitted measurements, the same account sees them in the web client, and retries/reinstalls do not create duplicates. Do not label a build production-ready based on compilation alone.
