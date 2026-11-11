# RunJeet — mandatory background pedometer and health sync architecture

## Product requirement
Step collection must not depend on RunJeet being open, a RunJeet account/login, or an internet connection. The device operating system's native health/pedometer service is the source of truth. RunJeet reads accumulated daily totals and activity records when it is opened and refreshes them when permissions allow.

## iOS
- Use Core Motion CMPedometer for cumulative step counts and historical queries from local midnight to now. The iPhone motion subsystem continues collecting steps while the app is suspended or terminated; RunJeet reads the accumulated count the next time it runs.
- Use HealthKit to read the user's daily step count and, with explicit permission, write RunJeet-originated workout/activity data where appropriate.
- Request HealthKit and Motion permissions separately with clear explanations. Do not assume permission is granted.
- No network connection is required for local pedometer collection or local queries.
- HealthKit background delivery is an optional refresh optimization, not a prerequisite for iPhone system step collection.
- When HealthKit and CMPedometer both report steps, do not add them together. Select one canonical daily total (prefer HealthKit aggregate when authorized; otherwise CMPedometer) to avoid double counting.
- A native iOS app with HealthKit capability/entitlements and a valid signed build is required. A browser PWA cannot access HealthKit or guarantee background sensor collection.

## Android
- Use Android's native hardware step counter sensor (TYPE_STEP_COUNTER) where present, with a native background strategy only where platform policy permits.
- Integrate Health Connect for historical and aggregated step records, with explicit user-granted permissions. Health Connect is the long-term Android health-data layer; do not make legacy Google Fit APIs the foundation.
- Handle devices without a hardware step counter with a clearly identified fallback; do not pretend accelerometer estimates are equivalent.
- Android background execution, battery optimization, manufacturer restrictions, and permission state must be tested by device.

## Data and privacy
- Local OS step collection must continue offline. Optional RunJeet cloud sync happens only when connectivity is available and the user has opted in.
- No RunJeet login is required to collect or view locally available device steps.
- Store source, date/time range, permission state, and last sync time. Never sum overlapping Apple Health, Core Motion, Health Connect, or device sensor totals.
- Clearly distinguish system-recorded steps from RunJeet GPS activity data and estimated browser motion steps.

## Acceptance tests
1. Walk with RunJeet force-closed and mobile data/Wi-Fi off; the system step total must still increase.
2. Reopen RunJeet and verify it imports/queries accumulated steps for the correct local day.
3. Repeat with the phone locked and in a pocket.
4. Deny health permissions and verify a clear permission state, not fabricated zeros.
5. Verify no duplicate counting when multiple health sources are enabled.
6. Test iPhone and multiple Android device families, including battery saver.

## Build status
The current GitHub Pages app is a web app and cannot meet this requirement by itself. The iOS Core Motion source scaffold exists but is not yet a complete, signed, installed native application; HealthKit integration and Android native/Health Connect implementation remain outstanding. Real device builds and tests are mandatory before claiming completion.