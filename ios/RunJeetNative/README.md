# NURUN native iOS app

This is the SwiftUI/WKWebView native iOS shell for NURUN. The existing RunJeet bundle identifier and native bridge names are retained for upgrade/data compatibility.

## Implemented
- Core Motion `CMPedometer` daily step query and live updates.
- HealthKit authorization for steps, walking/running and cycling distance, active energy and workouts.
- HealthKit observer queries with hourly background-delivery requests; updates trigger fresh daily totals and workout reads.
- Core Location configured for fitness activity, background location updates, and retained route points in device storage.
- Native bridge events for steps, GPS locations, route recovery, pedometer status and imported HealthKit workouts.
- Native workout export to HealthKit in the full-capability build.

## Requirements and limitations
- RunJeet must be installed as the native iOS app and the user must grant the relevant Motion & Fitness, Health and Location permissions.
- Background delivery is controlled by iOS and may be delayed; it is not a guaranteed real-time step stream.
- Background GPS is for an explicitly started activity. The app must have the required location authorization and the iOS location background capability.
- User force-quit terminates the app and tracking is not guaranteed to restart.
- The full-capability IPA includes the HealthKit code path but remains unsigned; it must be signed with an Apple development/distribution identity and a matching HealthKit entitlement before installation.
- The free-sideload IPA is compiled with `NURUN_FREE_SIDELOAD`, uses Core Motion for steps, saves workouts in NURUN local history, and explicitly disables HealthKit read/write calls because its build has no HealthKit entitlement.
- iOS CI keeps only the newest run for this branch; a newer commit supersedes an older queued or in-progress run.
- A successful CI build is not a substitute for physical iPhone tests with the screen locked.

