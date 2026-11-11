# RunJeet — fresh MVP

Standalone app source, independent of GATIVX, WalkOn and Mission-75.

Includes motion-based step estimation while active, GPS session recording, start/pause/resume/finish, live distance/time/pace, local IndexedDB persistence, backup export/import and an offline app shell.

Limitations: no Apple Health/HealthKit connection; iOS may suspend browser motion/GPS in background; accelerometer steps are estimates; backup transfer is manual, not cloud sync; calories are intentionally not fabricated.

Deploy these files to GitHub Pages or another HTTPS static host. GPS and motion permissions require HTTPS or localhost.