# NURUN Help & Support Guide

**A Product of Param IT Solutions™, Belgaum, India**  
**Document status:** First customer-help draft — must be checked against the release build before publication.

This guide explains the current NURUN / GATIVX test-build workflows and what to do when something goes wrong. Some screens in test builds may still display the earlier names **RunJeet** or **GATIVX**. The final customer release should use NURUN consistently.

## 1. Before you begin

- Use the same email address on your iPhone, Android device and web app if you want one cloud fitness history.
- Keep your app updated to the latest release supplied by NURUN.
- Allow only the permissions needed for the features you choose: motion/activity, location for outdoor route tracking, and Apple Health or Android Health Connect where supported.
- A local device copy and a cloud-synced copy are different. A message saying **Saved on this device** does not by itself mean the cloud copy has been updated.

## 2. Create an account and sign in

1. Open the app and find the Cloud Account section.
2. Enter your email address and a password of at least eight characters.
3. Choose **Create Account** only if you have never registered that email.
4. If the app asks you to confirm your email, check Inbox, Spam/Junk, Promotions and All Mail.
5. After confirming, return to the app and choose **Sign In** with the same email and password.

### If the confirmation email does not arrive

- Wait a few minutes and check Spam/Junk, Promotions and All Mail.
- Check that the email address was typed correctly.
- Do not repeatedly create accounts with the same address.
- If you have previously signed in successfully, try **Sign In** rather than registering again.
- If the account remains blocked, contact NURUN Support with the email address used (never send your password or a one-time code).

**Important:** The test backend may already have a confirmed account even when a later signup attempt displays a confirmation message. Re-registering is not a reliable fix.

### If sign-in fails

- Check for typing errors and accidental spaces in the email.
- Confirm that you are using the password originally set for that account.
- Do not share your password with support.
- If you cannot remember it, use the password-recovery option when available. If the current build does not show that option, request a password-reset link through the official support channel. The production app must provide a visible **Forgot password?** flow before public launch.

## 3. Understand your data and cloud sync

- **Saved on this device:** your current device has stored a local copy.
- **Cloud account connected:** the app has an authenticated cloud session.
- **Syncing / queued:** some records are still being transferred or waiting for a connection.
- **All records synced:** the app has completed its current upload queue.

If records do not appear on another device:

1. Check that both devices are signed in to the same account.
2. Check the internet connection.
3. Open the app and leave it active briefly so queued records can retry.
4. Refresh or reopen the app, then check the activity history again.
5. Do not uninstall the app or clear its website data while unsynced records may remain.

Use **Export Backup** before changing devices, reinstalling, or clearing browser data. Keep the exported backup somewhere safe. Use **Import Backup** only with a backup file created by the app.

## 4. Steps and health data

- Step totals may come from the phone's native pedometer or an approved health platform, depending on device and build.
- On iPhone, check Settings → Privacy & Security → Motion & Fitness and Apple Health permissions for NURUN where applicable.
- In Apple Health, review Settings / Apps and Services / NURUN (or the legacy app name shown by the installed build) and allow the requested categories.
- On Android, allow the activity-recognition permission and connect Health Connect if the build offers it.
- Keep in mind that permission denial, battery restrictions, background limits and device-specific sensor behaviour can affect readings.
- Do not assume a zero reading means you took zero steps until permissions and the data source have been checked.

If steps look wrong, compare the same date and time range on the phone's health app, note the NURUN reading and take a screenshot. Do not manually add duplicate steps unless the app explicitly instructs you to.

## 5. Outdoor workouts and GPS routes

1. Open **Workout** and choose Outdoor Walk, Outdoor Run or Outdoor Cycle.
2. Allow location access when prompted. For route recording, choose the location permission level recommended by your device and the app.
3. Start the activity in an area with a clear view of the sky where possible.
4. Keep the app open during a test session unless the installed native build explicitly confirms background tracking support.
5. Press **Finish** and wait for the save confirmation before closing the app.

If GPS does not start:
- Turn on Location Services.
- Check the app's location permission.
- Check that mobile data or Wi-Fi is available if the build requires it for maps.
- Move away from tall buildings or covered areas and wait for a location fix.
- Restart the app and try a short test only after the above checks.

If a workout disappears or fails to save:
- Do not immediately start repeated replacement sessions.
- Keep the app open and note the time of the workout.
- Check Recent Activities and the health app.
- Export a device backup if possible.
- Capture the error message and report the approximate start/end time, activity type, device model and app version.

## 6. Common problems and first actions

| Problem | First action |
|---|---|
| Confirmation email missing | Check Spam/Promotions; if previously registered, try Sign In |
| Invalid login credentials | Check email and password; request a reset through official support |
| Cloud account not connected | Check internet, sign in again and reopen the app |
| Data not appearing on another device | Confirm same account and allow queued sync to finish |
| Steps show zero | Check motion/activity permissions and health data-source access |
| GPS route is blank | Check location permission, signal and connectivity |
| Workout not saved | Keep app open, capture the error and export a backup |
| App appears stuck | Close and reopen once; do not clear app data before exporting a backup |
| Imported backup looks wrong | Stop further imports and retain the original backup file |

## 7. Contacting NURUN Support

Before contacting support, prepare:
- A short description of what you were trying to do.
- The date and approximate time the problem occurred.
- Your device model and operating-system version.
- The NURUN app version/build number.
- A screenshot or exact error wording.
- Whether the issue affects one device or multiple devices.

**Never send:** passwords, one-time passwords, full payment-card details, or private health records that are not needed to diagnose the issue.

### Official support details — release blocker

The production release must display a verified support email address or support URL, a response-hours statement, and a privacy notice explaining how diagnostic information is handled. These details have deliberately not been invented in this draft. Param IT Solutions must approve and publish the official contact channel before this guide is exposed to customers.

## 8. What support should do

Every support request should receive a ticket/reference number and move through these stages:

1. **Received** — customer gets an acknowledgement.
2. **Under review** — support checks the device, app version and reported symptoms.
3. **Reproducing** — the issue is tested without risking the customer's original data.
4. **Fix or workaround** — support explains the next action in plain language.
5. **Verified** — customer confirms the issue is resolved, or the team records why it remains open.
6. **Closed** — resolution and any follow-up release are documented.

Urgent data-loss, account-access and privacy reports should be prioritised. Support must never ask a customer for their password or OTP.

## 9. Release-readiness checklist for the NURUN team

These are product requirements, not claims that the current test build already contains them:

- [ ] Visible Forgot Password / password-reset flow.
- [ ] Resend confirmation email with cooldown and clear success/failure feedback.
- [ ] Distinguish new account, existing account, already-confirmed account and delivery failure.
- [ ] Never show “email sent” unless the auth service confirms the request was accepted.
- [ ] In-app Help Centre with searchable FAQs and troubleshooting.
- [ ] Contact Support form with ticket/reference number and consent-based diagnostics.
- [ ] Clear local-save, queued-sync and cloud-synced states.
- [ ] Workout-save recovery and duplicate-safe retry behaviour.
- [ ] Permission checks and platform-specific instructions for iOS and Android.
- [ ] Export-backup reminder before destructive recovery steps.
- [ ] Verified support contact, response hours, privacy policy and escalation process.
- [ ] Help content reviewed against the exact release build on iPhone, Android and web.

---

**NURUN**  
*A Product of Param IT Solutions™, Belgaum, India*  
*Move with purpose. Transform with every step.*
