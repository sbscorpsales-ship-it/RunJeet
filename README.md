# RunJeet

RunJeet is a device-first fitness tracker with a web dashboard hosted on GitHub Pages and native Android/iOS shells.

## Current implemented capabilities
- Native Android hardware step counting through `TYPE_STEP_COUNTER`, with a foreground health service, persistent daily total, midnight rollover and reboot-baseline recovery.
- Android Health Connect reads for daily steps, activity totals and imported workouts when the user grants each permission.
- Native iOS Core Motion pedometer and HealthKit daily totals/workout reads.
- HealthKit observer queries with hourly background delivery requests for supported health data types.
- Native GPS location services on Android and Core Location background-location configuration on iOS for active workouts.
- GPS route points persisted locally by the native service and replayed to the dashboard when it is active again.
- Local workout history, route display, IndexedDB persistence, and manual JSON backup/import.
- Android unit tests for daily step counter rollover, reboot handling and counter regression.

## Important operating boundaries
- Screen lock/background operation is supported by the native tracking implementations subject to OS scheduling, permissions, device settings and manufacturer battery controls. It must still be validated on physical devices.
- Force-quitting the iOS app or force-stopping the Android app terminates its process; continuous tracking after those actions is not guaranteed.
- The GitHub Pages browser/PWA version cannot provide the same reliable screen-off sensor and GPS behavior as the native apps.
- GPS is intended for an explicitly started workout, not continuous all-day location collection.
- Steps, distance and calories are shown only when sourced from the device/health platform or clearly identified as estimates. No browser accelerometer step estimates are used.
- Profile, sessions and route history are stored on the device. There is no server authentication or automatic cross-device cloud sync yet.

## Build and verification
- Android CI runs unit tests, assembles a debug APK and uploads it as a workflow artifact.
- iOS CI compiles simulator and unsigned device targets and packages an unsigned IPA artifact. Installation still requires signing.
- Passing CI proves compilation/tests only. It does not prove background behavior on a physical phone.

See the GitHub Actions workflows for current build results.
