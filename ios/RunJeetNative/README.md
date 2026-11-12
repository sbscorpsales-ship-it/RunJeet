# RunJeet native iOS app

This is the SwiftUI/WKWebView native iOS shell for RunJeet.

## Implemented
- Core Motion `CMPedometer` daily step query and live updates.
- HealthKit authorization for steps, walking/running and cycling distance, active energy and workouts.
- HealthKit observer queries with hourly background-delivery requests; updates trigger fresh daily totals and workout reads.
- Core Location configured for fitness activity, background location updates, and retained route points in device storage.
- Native bridge events for steps, GPS locations, route recovery, pedometer status and imported HealthKit workouts.
- Native workout export to HealthKit.

## Requirements and limitations
- RunJeet must be installed as the native iOS app and the user must grant the relevant Motion & Fitness, Health and Location permissions.
- Background delivery is controlled by iOS and may be delayed; it is not a guaranteed real-time step stream.
- Background GPS is for an explicitly started activity. The app must have the required location authorization and the iOS location background capability.
- User force-quit terminates the app and tracking is not guaranteed to restart.
- The GitHub Actions workflow compiles simulator and unsigned device builds. The unsigned IPA is not directly installable until signed with an appropriate Apple development/distribution identity.
- A successful CI build is not a substitute for physical iPhone tests with the screen locked.

