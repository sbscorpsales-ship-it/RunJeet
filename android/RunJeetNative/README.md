# RunJeet native Android app

This is the Android application module used to build the native RunJeet APK.

## Implemented
- Hardware `Sensor.TYPE_STEP_COUNTER` for device steps (not raw motion estimates).
- Foreground health service to keep the pedometer registered while the app is backgrounded.
- Persisted daily baseline and delta accounting across midnight and device reboot.
- Health Connect daily step aggregation and optional distance, active-calorie and workout reads.
- Foreground location service for explicitly started GPS workouts, with route points persisted locally.
- Native bridge events to update the dashboard and replay saved route points after the UI resumes.
- Android unit tests for step total calculation edge cases.

## Permissions
The app requests Activity Recognition, Health Connect permissions and location permissions as needed. Android 13+ notification permission is requested for visible foreground-service notifications; declining it does not intentionally block service startup.

## Requirements and limitations
- Screen-lock behavior depends on foreground-service eligibility, user permissions, Android version and device battery-management policy.
- Force-stop from Android Settings terminates the app/services; restart and continued tracking are not guaranteed.
- Health Connect access is optional and each metric has an independent permission.
- GPS recording is started for an active workout, not continuously all day.
- CI runs unit tests and assembles a debug APK. Passing CI does not prove operation on a physical handset.
