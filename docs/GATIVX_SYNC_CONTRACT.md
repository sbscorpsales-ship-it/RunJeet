# GATIVX Cloud Sync Contract

## Purpose
The same signed-in GATIVX member should see their saved goal blueprint, daily action completion, and supported activity records across the web app, iOS wrapper, and Android wrapper. Local capture remains available while offline; cloud sync is the shared source when connected.

## Daily action progress
- Table: `public.daily_action_progress`
- Primary key: `(user_id, action_date)`
- Payload: `completed` JSON object keyed by the stable action IDs rendered by the app.
- Timestamp: `updated_at` in UTC.
- RLS: authenticated members may select, insert, update, and delete only rows where `user_id = auth.uid()`.
- Realtime: table is included in `supabase_realtime`.
- Client: queues writes while offline, upserts when connected, pulls recent dates, and listens for Realtime changes.

## Conflict handling
The client compares local and cloud update timestamps when pulling a date. The newer timestamp wins for that date. This is a last-writer-wins whole-day object, not a per-action merge. Device clocks and simultaneous edits can affect conflict outcomes; a future revision may use per-action timestamps or server-generated versions if testing shows this is needed.

## Offline behavior
- Local action completion is saved before cloud sync is attempted.
- Failed uploads remain in the existing local outbox for retry.
- A reconnect triggers queue flush and cloud pull.
- Local history and actions are not intentionally deleted by sign-out.

## Validation and limitations
- JavaScript syntax and whitespace checks run in GitHub Actions.
- Android and iOS build workflows validate compilation only.
- These checks do not prove native sensor collection, background delivery, device installation, or cross-device synchronization.
- Acceptance test still required: complete one action on device A, sign into the same account on device B, confirm the same date/action state appears; toggle it on B and confirm it returns to A after Realtime or refresh. Repeat with airplane mode on A followed by reconnect.
- Never seed fake step counts or claim a sensor reading is real unless its source is identified.
