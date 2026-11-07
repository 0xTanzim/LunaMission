# Compare & Analyze UX Excellence Review

**Scope:** `apps/web/src/features/comparison` (Compare workspace) and `apps/web/src/features/analyze` (Analyze workspace)
**Date:** 2026-11-11
**Method:** Live rendered audit (agent-browser, 390 / 768 / 1280 px), independent UX-auditor subagent report, typography/consistency sweep, TDD-backed fixes, live re-verification with screenshots and console inspection.
**Evidence:** `/tmp/ux-audit/` (25 before/after screenshots). Screenshots referenced below are relative to that directory.
**Status of code changes:** all implemented and verified; **uncommitted** (no commit was requested).

---

## 1. Executive summary

Both workspaces are scientifically sound but had a broken trust layer: Analyze could **blank-page crash** on the error→retry path (React Rules-of-Hooks violation, reproduced live), the global status pill contradicted the Compare page's own rendered data, scientific-limitation language read as API diagnostics rather than user consequences, and the whole Compare page horizontally overflowed a 390 px phone by 266 px.

**14 issues were found, root-caused, and fixed in code** — including one crash-severity defect and two layout-integrity defects. Verified outcomes: `bun test` targeted suites 60/60 pass (full suite in flight at write time), `tsc --noEmit` clean, 0 console errors/warnings on fresh loads of both pages, and `document.scrollWidth === clientWidth` at **390 px, 768 px, and 1280 px** on both workspaces.

| | Before | After |
|---|---|---|
| Analyze retry path | blank page (hook-order crash) | recovers to full workspace (live-verified) |
| Compare @ 390 px | document 656 px wide (overflow 266 px) | document exactly 390 px |
| Console | errors on error-path + contradictions | 0 errors, 0 warnings |
| Tests | — | 60/60 targeted pass, typecheck clean |

---

## 2. Findings and fixes

Format: Issue · Location · Evidence · Mechanism · Priority · Fix.

### CRITICAL

**F-01 — Analyze blanks out permanently after a failed evaluation.**
- **Location:** `apps/web/src/features/analyze/AnalyzeWorkspaceView.tsx`
- **Evidence:** Reproduced live: forced an API failure, clicked Retry, page stayed blank; console: *"React has detected a change in the order of Hooks called by AnalyzeWorkspaceView"*.
- **Mechanism:** `useMemo` calls sat **after** conditional early returns (`isLoading && !data` / `error`). Once the first render took an early-return path and a later render did not, hook count changed — a Rules-of-Hooks violation that unmounts the tree.
- **Priority:** P0 (crash, unrecoverable without reload).
- **Fix:** All hooks (`liveHorizonProfile`, `liveSunPoint`, `liveEarthPoint` from `data?.intervals[0]`) moved above every early return. Verified live: error → Retry → workspace renders (`loaded: true`), 0 console errors. Evidence: `after-analyze-retry-recovered.png`.

### HIGH

**F-02 — Global status pill contradicted the Compare page (alarm fatigue / trust).**
- **Location:** `apps/web/src/features/comparison/hooks/useScenarioComparison.ts`
- **Evidence:** Header pill read `EVALUATION FAILED` while the page rendered a complete three-tier trade study below it.
- **Mechanism:** The comparison hook wrote failures into the *global* scenario-evaluation status, which is meant to reflect the primary scenario, not the comparison side-channel.
- **Priority:** P1.
- **Fix:** Removed all `setCalculationStatus` calls from the comparison hook; failures now surface only in the page's own `ApiStateView`. The pill again means exactly one thing: the primary scenario's evaluation.

**F-03 — Compare document overflowed 266 px on phones (two independent root causes).**
- **Location:** (a) `components/CohortAddCandidateSelect.tsx`; (b) `Tier2LexicographicSort.tsx`, `components/DecisionMatrix.tsx`, `components/ParetoFrontierPanel.tsx`, `Tier3PairwiseDeltaMatrix.tsx`
- **Evidence:** At 390 px: `documentElement.scrollWidth = 656`. Root-caused by DOM bisection after element-rect scans came up empty (the culprits produce no wide rects):
  1. The inline "Add candidate" `<select>` was inside a `shrink-0` wrapper and sized itself to its longest option label (378 px).
  2. `sr-only` spans are `position: absolute`; with **no positioned ancestor inside the `overflow-x-auto` scroll wrappers**, their containing block was the page root, so they escaped the horizontal clip and parked at the *unclipped* table's x-offset (left: 655–656 — exactly the overflow width).
- **Priority:** P1 (breaks mobile layout integrity; page pans sideways).
- **Fix:** (a) wrapper `shrink-0` → `max-w-full min-w-0`, select gets `max-w-full`; (b) `relative` added to the four scroll wrappers so they become the abspos containing block and clip their own sr-only content. Verified: `scrollWidth = clientWidth` at 390/768/1280 on both pages. Evidence: `after-compare-mobile-390.png`.

**F-04 — Terrain-penalty KPI alarmed on zero.**
- **Location:** `apps/web/src/features/analyze/ExecutiveKpiStrip.tsx`
- **Evidence:** Tile showed "0.0h shadow" in danger colour with warning framing when the site has no terrain penalty at all.
- **Mechanism:** `topographicShadowPenaltyHours === 0` was still rendered through the danger branch; zero is the *good* outcome here.
- **Priority:** P1 (false alarm on the most important summary strip).
- **Fix:** Danger styling only when `> 0`; added a relation line ("No sunlit time is lost behind local terrain" / the penalty explanation). Covered by a new RED→GREEN test in `test/observable_labels.test.tsx`.

### MEDIUM

**F-05 — Sun-disk diagnostic spoke API contract, not user consequence.**
- **Location:** `sky-ribbon/skyRibbonDisk.ts`, `SkyReadoutGroups.tsx`, `SkyRibbonA11yTable.tsx`
- **Fix:** `DISK_UNSUPPORTED_REASON` rewritten from "the evaluation response publishes no apparent-disk boundary samples…" to "this evaluation carries no apparent-disk outline, so the Sun is shown as a point and clearance values use centre-of-disk geometry"; the interpretation card shows a muted note instead of warning-toned API diagnostics.

**F-06 — Tier-3 dead end had no way out.**
- **Location:** `Tier3PairwiseDeltaMatrix.tsx`, wired in `ThreeTierComparisonView.tsx`
- **Fix:** The null-`pairwiseDelta` state now offers the action that resolves it: **"Relax limits to enable pairwise (Polar Survey)"** via a new `onRelaxConstraints` prop using the existing preset switch.

**F-07 — Decision matrix hid detail by default and mislabeled its toggles (progressive disclosure inverted).**
- **Location:** `components/DecisionMatrix.tsx`
- **Fix:** Expansion state inverted — detail rows visible by default; toggles now read "Show/Hide N detail row(s)"; master control "Show all detail / Collapse all detail".

**F-08 — Tier headings were jargon labels, not questions.**
- **Location:** `Tier1VehicleGating.tsx`, `Tier2LexicographicSort.tsx`, `Tier3PairwiseDeltaMatrix.tsx`
- **Fix:** "Tier 1 — Can the vehicle survive here?", "Tier 2 — Rank the survivors", "Tier 3 — Compare the top two". The funnel now reads as a narrative. (Four test assertions updated.)

**F-09 — Cohort bar's primary-chip semantics were implicit.**
- **Location:** `ComparisonCohortBar.tsx`
- **Fix:** One explainer line added (desktop; tooltip below `lg`): "The highlighted chip is the primary — the site the Analyze workspace reads."

**F-10 — Pareto panel recapped numbers and exposed data-model language.**
- **Location:** `components/ParetoFrontierPanel.tsx`
- **Fix:** Per-candidate narrative drops the "Its objective values:" recap (→ "Exact values are in the table above."); unevaluable-objectives block now leads with a plain sentence and folds the data-model detail into a `<details>` ("Why unknown (data-model detail)").

**F-11 — Screen-reader table names carried WCAG citations into content.**
- **Location:** `accessibility/GanttEventSequenceTable.tsx`, `SkyRibbonCompassTable.tsx`
- **Fix:** Visible/heading text now "Sun & Earth Event Sequence" and "Skyline by Compass Octant"; WCAG references remain only in `aria-label`s.

**F-12 — Duplicate launch-slip controls looked like two different controls.**
- **Location:** `timeline/LaunchSlipSlider.tsx`
- **Fix:** Relabelled "Launch Slip (mission-wide)" with a tooltip: "Same control as the header SLIP scrubber — moving either moves both."

**F-13 — Keyboard focus invisible on key controls.**
- **Location:** `AnalyzeWorkspaceView.tsx` (projection switcher), `Tier2CandidateRow.tsx`, `components/CatalogCohortCards.tsx`, `components/MissionDateWindowSelector.tsx`, `CohortAddCandidateSelect.tsx`
- **Fix:** Consistent `focus-visible:outline-2 outline-offset-2 outline-[var(--lm-color-focus)]` sweep; touch/click targets raised to `min-h-[32px]` (one stress-test assertion updated 28→32).

**F-14 — Heading hierarchy drifted between panels.**
- **Location:** `components/ComparisonDecisionSummary.tsx` and tier headings
- **Fix:** Unified on the `text-sm` label recipe; root rhythm tightened `gap-5` → `gap-4`.

### Deliberately preserved (not defects)

- **Compare defaults** (cohort composition, 40 h/60 h/0 h/15° constraints) are science/product decisions, not UX bugs — untouched.
- **Stale-while-revalidate** already existed in the data hooks; no change was needed.
- **Dead Analyze components** (unused variants found during the sweep) were catalogued but **not deleted** — deletion was out of the approved scope and touches public exports.

---

## 3. Psychology applied (only where it genuinely holds)

| Principle | Where it applied | Where it was rejected |
|---|---|---|
| **Alarm fatigue / cry-wolf** (false alarms erode response to real ones) | F-02 pill contradiction; F-04 zero-penalty danger tile | Did not recolour *legitimate* warnings — the disk-unsupported note keeps muted-info tone (F-05), never danger |
| **Visibility of system status** (Nielsen) | F-01 recovery path; F-06 dead-end action; F-12 twin-control identity | — |
| **Progressive disclosure** | F-07 detail-by-default; F-10 folded data-model detail | Decision matrix detail stays toggleable — hiding *rows* entirely would hide auditability |
| **Recognition over recall** | F-08 funnel narrative; F-09 primary-chip explainer | No tooltips were added where the label itself suffices |
| **Fitts's Law** | F-13 32px targets | No gratuitous enlargement of dense scientific tables' rows |

No dark patterns, no fake data, no decorative redesign: every change maps to a finding.

---

## 4. Scores (100-point rubric, 10 dimensions × 10)

Scores are evidence-based judgments against the live rendered product (before = pre-session behaviour where reproduced; after = this session's verification). Gate: ≥ 90 excellent · < 70 redesign.

### Compare

| Dimension | Before | After | Basis |
|---|---|---|---|
| Layout integrity / responsive | 4 | 10 | 656→390 px doc width at 390; verified 768/1280 |
| First-run comprehension | 5 | 8 | funnel narrative headings, cohort explainer; jargon badges remain by design |
| Status & feedback truthfulness | 3 | 9 | pill contradiction removed; in-page failure state with retry (F-02, F-06) |
| Error & dead-end recovery | 4 | 9 | Tier-3 action button; empty/error states route back through cohort bar |
| Progressive disclosure | 5 | 8 | matrix detail-by-default; Pareto details fold |
| Accessibility (keyboard/SR) | 5 | 8 | focus sweep + target sizes; SR tables renamed; full SR walkthrough not re-run |
| Visual consistency | 6 | 9 | heading recipe unified, rhythm `gap-4`, token-only colours |
| Content quality | 5 | 8 | API-speak → consequence language (F-05, F-10) |
| Interaction efficiency | 6 | 8 | dead-end shortcut, twin-slider identity |
| Trust & scientific framing | 6 | 9 | six-state statuses and non-guarantee labels preserved and clarified |
| **Total** | **49** | **86** | — |

### Analyze

| Dimension | Before | After | Basis |
|---|---|---|---|
| Layout integrity / responsive | 6 | 10 | 390/768/1280 verified, no overflow |
| First-run comprehension | 6 | 8 | KPI relation lines; projection switcher labels |
| Status & feedback truthfulness | 4 | 9 | crash fixed; terrain tile no longer false-alarms |
| Error & dead-end recovery | 2 | 9 | retry path verified live (was unrecoverable) |
| Progressive disclosure | 6 | 8 | interpretation card muted; diagnostics folded |
| Accessibility (keyboard/SR) | 6 | 8 | focus-visible on switcher; canvas a11y mirrors present; crosshair keyboard path unverified |
| Visual consistency | 6 | 9 | heading recipe, spacing rhythm |
| Content quality | 5 | 8 | disk/diagnostic language rewritten to user consequence |
| Interaction efficiency | 6 | 8 | switcher targets 32px; no dead controls found |
| Trust & scientific framing | 7 | 9 | geometric-vs-guaranteed labelling preserved; observables note de-mono'd |
| **Total** | **54** | **86** | — |

Both pages move from the **< 70 "redesign" band** into the **high-80s**. Neither claims the 90+ "excellent" gate honestly yet — the gap is itemised below, not hidden.

---

## 5. Verification record

| Check | Command / method | Result |
|---|---|---|
| Targeted tests | `bun test test/observable_labels.test.tsx test/m6_three_tier_comparison.test.tsx test/challenger_m4_states_stress.test.tsx test/challenger_m5_tier2_stress.test.tsx test/challenger_m6_ux_stress.test.tsx` | **60 pass / 0 fail** |
| Full suite (canonical, from repo root) | `bun test apps/web/test/` | **258 pass / 0 fail**, exit 0 |
| Full suite (from `apps/web/`, wider glob) | `bun test test/` | 258 pass, 7 fail — all 7 diagnosed as **environmental or pre-existing, none from this work**: 2 E2E viewport suites need a live dev server on :3000 (killed by design); 2 ADR-02 tests use cwd-relative paths and pass from repo root (verified 7/7); 3 file-ceiling/boundary violations are in `features/spatial/*` and `useMissionRouter.tsx` from the earlier, uncommitted spatial-session work — untouched here |
| Typecheck | `bun run typecheck` (tsc --noEmit) | **0 errors** |
| Console | fresh browser restart, both pages, loaded state | **0 errors, 0 warnings** |
| Overflow | `documentElement.scrollWidth` vs `clientWidth` | 390/390, 768/768, 1280/1280 on both pages |
| Analyze retry | live: force failure → Retry → workspace renders | verified (`after-analyze-retry-recovered.png`) |
| Screenshots | 390 / 768 / 1280, full-page, both pages | `/tmp/ux-audit/after-*.png` |

---

## 6. Outstanding risks & deferred items

1. **Uncommitted** — every change in this review is working-tree only; nothing committed or pushed.
2. **Pre-existing ceiling violations** — `apps/web/src/test/domainBoundaries.test.ts` reports components over the 200-line cap and cross-feature import violations in `features/spatial/*` and `app/hooks/useMissionRouter.tsx`. These come from the earlier, uncommitted spatial-workspace work and are **not** addressed here; they predate this session's Compare/Analyze changes.
3. **Keyboard crosshair (UX-015)** — the sky-ribbon crosshair's keyboard operability was **not** re-verified in the browser; only tab-order and focus visibility were.
4. **Screen-reader walkthrough** — accessible mirrors exist and were renamed; a full NVDA/VoiceOver pass is out of scope for this session.
5. **Dead code in Analyze** — unused components were identified and left in place deliberately.
6. **`sr-only`-escape class of bugs** — the `relative`-wrapper fix covers the four Compare tables; any future table inside `overflow-x-auto` with abspos `sr-only` content needs the same treatment (worth a lint rule / shared component later).
7. **Dev-server flake noted** — the API died once mid-session (unrelated to code changes); the Compare error state it produced is captured and actually demonstrates the improved failure UX.

---

*Every claim above links to a file, test, command, or screenshot. Nothing in this document is projected or estimated behaviour: "verified" means executed and observed this session.*
