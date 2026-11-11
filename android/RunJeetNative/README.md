# Android native step source scaffold

- Hardware sensor: Android TYPE_STEP_COUNTER (not raw handset shaking).
- Health data: Health Connect aggregate for today's StepsRecord.
- Permission: ACTIVITY_RECOGNITION plus Health Connect read-steps permission.
- Internet is not required for the hardware sensor to collect device steps.

This is source scaffolding only, not a complete Android Studio project or installable APK. The Android app module, Health Connect dependency/version, permission request flow, persistent boot baseline handling, lifecycle/background policy, signing and device tests still need to be completed. Do not use the sample boot marker implementation as production-grade reboot detection without replacing it with a reliable boot/session identifier and persisted day baseline.
