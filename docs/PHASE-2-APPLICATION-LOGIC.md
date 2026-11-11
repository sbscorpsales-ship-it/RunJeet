# RunJeet — Phase 2 Application Logic

## Delivered

The core application controller in `app.js` has been hardened:
- Motion-based step detection uses linear acceleration when available and a gravity high-pass fallback otherwise.
- Sensor permission is requested only after the user presses Enable Steps.
- Duplicate motion peaks are rate-limited to reduce over-counting.
- Date keys are built from local calendar components to avoid locale-format surprises.
- IndexedDB writes are serialized to avoid overlapping transaction races.
- GPS points with poor accuracy are ignored; accepted points are persisted.
- Activity start is not reported as successful until the initial state is saved.
- Paused and interrupted sessions are recovered in a paused state after reload instead of being silently discarded.
- Finishing an activity retains the session if persistence fails, allowing a retry.
- Backup import validates the schema and checks session fields before merging.
- Export URL revocation is delayed until the browser has started the download.

## Validation performed

- The complete updated JavaScript file was retrieved from the GitHub repository.
- JavaScript parse/syntax check passed using the JavaScript runtime parser.
- This is a source-level validation only. Real motion-sensor accuracy, GPS performance, IndexedDB behavior on iPhone, and background suspension still require device testing.

## Known limits (unchanged)

- The web app does not read Apple Health / HealthKit.
- The browser cannot guarantee continuous background pedometer or GPS capture on iOS.
- Local IndexedDB is device/browser-specific; there is no automatic cloud synchronization.
- Step counts are estimates and should be compared with a trusted device counter during field testing.
