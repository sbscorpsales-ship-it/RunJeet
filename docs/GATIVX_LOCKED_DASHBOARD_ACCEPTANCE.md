# GATIVX Dashboard — Founder-Locked Visual Reference

**Status:** LOCKED — exact visual reproduction required.
**Reference:** Founder-supplied dashboard screenshot in the conversation on 24 November 2026.
**Scope:** Web hub and responsive dashboard implementation across web, iOS and Android where the approved design applies.

## Non-negotiable instruction

Reproduce the supplied reference exactly. Do not redesign, modernise, simplify, reinterpret, rearrange, substitute, resize or restyle any visual element. No changes are authorised to branding, logo, colours, typography, font sizes, font weights, spacing, proportions, card sizes, ring sizes, chart styles, navigation, icons, labels, or component order. Preserve the screenshot's overall composition and hierarchy 100%.

Any proposed visual change requires explicit, separate founder approval before implementation. A developer preference, accessibility preference, framework limitation or generic design-system convention does not authorise a visual change. If an implementation limitation arises, report it and seek approval rather than silently changing the design.

## Elements to preserve

- GATIVX logo and brand treatment; orange/red/yellow hero banner with running imagery; navy left navigation rail; white top bar.
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
- Verify branding, colour values, typography/font sizes, positions, card dimensions, order, chart/ring geometry, icons and navigation.
- Check desktop and responsive layouts without changing the design's intended proportions or hierarchy.
- Capture side-by-side screenshots and record any pixel/geometry differences.
- Any unapproved visual deviation is a failed acceptance test.
- Do not mark the dashboard complete until the founder can open the browser preview and inspect it.

## Change control

**Default is no visual change.** Only the founder can approve an amendment, and approval must identify the exact element to change. This lock applies to all current and future implementation branches and pull requests.
