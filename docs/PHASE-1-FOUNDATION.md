# RunJeet — Phase 1 Foundation

## Product boundary

RunJeet is a focused fitness activity tracker. The first release contains only:
- Daily step count from device motion events while the app is active.
- GPS activity recording while the browser grants location access.
- A live dashboard for steps, distance, elapsed time, and pace.
- Local activity persistence and JSON backup/restore.

No accounts, cloud service, social features, coaching, calorie claims, or third-party integrations are part of this phase.

## Runtime architecture

The current delivery is a static Progressive Web App:
- `index.html`: semantic screen structure and accessible controls.
- `styles.css`: responsive presentation.
- `app.js`: application state, motion/GPS collection, persistence, and rendering.
- `manifest.webmanifest`: install metadata.
- `sw.js`: static shell caching for offline launch.

There is no application server or remote database in this build. This is intentional for the zero-cost MVP. Local data is not automatically synchronized across devices.

## Data model (schema version 1)

The IndexedDB database is `runjeet-fresh-v1`, with one object store named `state`. The primary record uses key `main`.

```ts
type RunJeetStateV1 = {
  version: 1;
  stepsByDay: Record<LocalDate, number>;
  sessions: ActivitySession[];
  active: ActiveSession | null;
  lastUpdated?: string; // ISO-8601
};

type GPSPoint = {
  lat: number;
  lon: number;
  accuracy: number; // metres
  ts: number; // epoch milliseconds
};

type ActiveSession = {
  id: string;
  startedAt: number;
  pausedAt: number | null;
  pausedMs: number;
  points: GPSPoint[];
  gpsAccuracy?: number;
};

type ActivitySession = ActiveSession & {
  endedAt: number;
  distanceM: number;
  durationSec: number;
};
```

## Data invariants

1. Daily step counts are non-negative integers keyed by local calendar date.
2. GPS points are appended in timestamp order; points with poor accuracy are ignored.
3. Distance is calculated from consecutive GPS coordinates using the haversine formula.
4. Active duration excludes paused time.
5. A completed session is immutable in the history list unless a future migration explicitly changes this rule.
6. A backup identifies the product and schema version before import.
7. The app must not manufacture calorie values or claim background tracking reliability that the browser cannot guarantee.

## Platform constraints

- Motion and geolocation require a secure context (HTTPS or localhost) and user permission.
- iOS browser/PWA execution can be suspended when backgrounded or locked; this build cannot promise continuous background GPS or pedometer operation.
- Browser JavaScript cannot directly read Apple Health / HealthKit. Native iOS integration requires a native app and HealthKit entitlement/capability.
- The current motion-based step counter is an estimate and must be validated on target devices before being described as medically or commercially accurate.

## Phase 1 acceptance checks

- The source tree contains all static app assets and references resolve.
- JavaScript parses without syntax errors.
- The manifest is valid JSON and points to existing assets.
- The service worker uses same-origin app-shell paths.
- No secret keys or paid-service credentials are required.
- Deployment is considered successful only after the hosting workflow completes and the public URL returns the app; a queued or failed workflow is not a deployment.
