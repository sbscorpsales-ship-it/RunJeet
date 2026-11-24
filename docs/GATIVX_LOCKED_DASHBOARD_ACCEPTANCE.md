# GATIVX Dashboard — Founder-Locked Visual Reference

**Status:** LOCKED — exact visual reproduction required.
**Reference:** Founder-supplied dashboard screenshot in the conversation on 24 November 2026.
**Scope:** Web hub and responsive dashboard implementation across web, iOS and Android where the approved design applies.

## Non-negotiable instruction

Reproduce the supplied reference exactly. Do not redesign, modernise, simplify, reinterpret, rearrange, substitute, resize or restyle any visual element. No changes are authorised to branding, logo, colours, typography, font sizes, font weights, spacing, proportions, card sizes, ring sizes, chart styles, navigation, icons, labels, or component order. Preserve the screenshot's overall composition and hierarchy 100%.

Any proposed visual change requires explicit, separate founder approval before implementation. A developer preference, accessibility preference, framework limitation or generic design-system convention does not authorise a visual change. If an implementation limitation arises, report it and seek approval rather than silently changing the design.

## Exact hero, background and profile details — individually locked

- The **two runners** on the right side of the hero banner are mandatory: retain both people, their running poses, relative scale, positions, direction, clothing silhouettes and visual relationship as depicted. Do not replace them with one runner, different people, generic fitness icons, stock substitutions or abstract artwork.
- Preserve the **sunrise/sunset horizon scene** behind the runners, including the bright sun at the right, warm glowing horizon and atmospheric depth.
- Preserve the full **orange-to-red-to-golden-yellow sunrise gradient** across the hero banner, including its transitions, brightness, contrast and placement. Do not replace it with a flat colour, dark gradient, generic background or different photograph.
- Preserve the **circular member profile portrait frame** at the left of the hero greeting: its circular crop, white/light outer ring, border thickness, size, position and spacing. Do not turn it into a square, remove its frame, change its shape or substitute a generic avatar when a real profile photo is available.
- Preserve the hero's exact composition: profile/greeting on the left, large central GATIVX identity and tagline, Param IT Solutions endorsement beneath, and the two runners with the sunlit background on the right.
- Preserve the original hero height, image crop, text alignment, spacing and balance. Do not let responsive adaptation remove, hide or replace the two runners, sunrise background or profile frame; maintain the approved composition and hierarchy.

## Elements to preserve

- GATIVX logo and brand treatment; orange/red/yellow hero banner with **both runners and the sunrise scene**; navy left navigation rail; white top bar.
- Header structure: menu control, GATIVX Web Hub title, search, notification, member avatar/name and account control.
- Greeting/profile area and hero identity, tagline and Param IT Solutions endorsement.
- Goal, target date, weight-goal progress and Mission 75 summary strip.
- Main dashboard card order and dimensions: Today's Progress rings and metrics; Activity & Route (GPS); Weight Trend.
- Secondary metric cards: Sleep, Hydration, Nutrition (Today), Heart Health and Active Minutes.
- Bottom Today's Plan checklist and Guru Mode call-to-action.
- All typography scale, alignment, iconography, borders, radii, shadows, colours, spacing, proportions and responsive visual hierarchy as shown.
- The original visual density and balance. Do not add/remove/reorder cards or navigation items.

## Data integrity is separate from visual fidelity

The screenshot is the visual source of truth, not a source of live member readings. Values visible in the reference (including steps, calories, distance, pace, elevation, sleep, hydration, nutrition, heart rate, weight, goals and dates) are illustrative screenshot content and must not be copied into production as the member's actual data.

Keep the design unchanged while binding each metric to validated, consented, real data. Where data is missing, denied, stale or unavailable, use an honest state that fits the existing component without inventing a reading. Do not turn the screenshot's sample values into seeded or default production data. If a truthful empty/error state cannot fit without altering the approved design, raise the issue for founder review rather than redesigning.

## Visual acceptance gate

- Compare implementation against the founder screenshot at the same viewport/aspect ratio.
- Verify both runners, sunrise scene/gradient, circular profile frame, branding, colour values, typography/font sizes, positions, card dimensions, order, chart/ring geometry, icons and navigation.
- Check desktop and responsive layouts without changing the design's intended proportions or hierarchy; both runners, sunrise background and profile frame must remain present.
- Capture side-by-side screenshots and record any pixel/geometry differences.
- Any unapproved visual deviation is a failed acceptance test.
- Do not mark the dashboard complete until the founder can open the browser preview and inspect it.

## Change control

**Default is no visual change.** Only the founder can approve an amendment, and approval must identify the exact element to change. This lock applies to all current and future implementation branches and pull requests.
