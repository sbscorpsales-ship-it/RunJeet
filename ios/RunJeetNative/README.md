# Native iOS pedometer bridge (development scaffold)

This folder contains the first native iOS bridge for RunJeet.

- Uses Apple's Core Motion CMPedometer, not raw handset movement thresholds.
- Queries today's step total from local midnight and subscribes to updates.
- Sends the count to the RunJeet web dashboard as the `runjeetNativeSteps` browser event.
- Wraps the deployed RunJeet web app in WKWebView.

## Important build requirements
This is source code, not an installable iPhone app yet. It must be added to an iOS Xcode app target, built with Xcode on macOS, and signed for installation. An Apple Developer account may be required for distribution beyond limited personal development signing. This has not been compiled or device-tested yet.

## Next integration
The web app must listen for `runjeetNativeSteps` and use the native daily total as its step source when running inside this wrapper. The browser motion detector must be disabled in the native wrapper to avoid double counting.
