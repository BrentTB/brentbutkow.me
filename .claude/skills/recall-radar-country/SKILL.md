---
name: recall-radar-country
description: >-
  Runbook for adding a country or recall source to Recall Radar — the type/enum wiring,
  the copy that enumerates countries (the recurring miss), country-conditional behavior,
  and tests. Use when adding a country, agency, or data source to the recall dashboard.
---

# Add a Recall Radar country/source — runbook

Precedents: Canada (PR #113) and South Africa (PR #98). The frontend is data-driven — most
UI adapts automatically once the config records are filled in. The recurring review misses
were **copy that enumerates countries** and **behavior on countries missing a facet**
(no companies, no classifications).

## 0. Backend first

Data comes from the separate backend (`https://github.com/BrentTB/brentbutkow.me-backend`,
locally a sibling checkout) via `VITE_API_URL` ([src/api/api.ts](../../../src/api/api.ts)).
The backend must ingest and serve the new country before any frontend step matters.

## 1. Types — `src/projects/RecallRadar/recall.types.ts`

Add the country code to the `RecallCountry` const object (repo pattern: const object +
derived type, never a bare string union). New agencies/feeds → add to `RecallSource` too.

## 2. Config records — `src/projects/RecallRadar/data.ts`

`Record<RecallCountry, …>` types make `tsc` list what you missed. Fill in:

- `countryLabels` — display name
- `classesByCountry` — its classification scheme (`[]` is valid: South Africa has none;
  the classification filter then hides itself)
- `sourcesByCountry` + `sourceLabels` — its feeds and their short names
- `recallRadarLinks` — a link to the agency's API/recall page

`LocationSelector` iterates `Object.values(RecallCountry)` — the tab appears on its own.

## 3. The copy that always gets missed

These strings enumerate countries/agencies and do NOT update themselves. Grep-and-fix all:

- `data.ts`: `intro` **and** `introFun` (both modes!), the methodology text +
  `methodologyPoints`, the tech-stack "Data & infra" line
- `subscription/SubscriptionFields.tsx`: the disclaimer listing official agency channels

New copy → humanizer skill. Both fun-mode variants stay in sync.

## 4. Country-conditional behavior — check, don't assume

- **Companies**: `hasCompanies` derives from live stats in `RecallRadar.tsx`. The search
  placeholder swaps ("…or company" only when companies exist — this shipped wrong once),
  the company type-ahead hides, but the filter chip **must keep rendering** so a shared
  `?company=X` URL stays clearable on a company-less country (intentional; also shipped
  wrong once — see the comment in `components/RecallFilters.tsx`).
- **Filters**: classification control hides when `classesByCountry` is empty; source filter
  hides when the country has a single source. Confirm the new country gets the right set.
- **US-only features**: the state map (and themes-row layout) is gated on
  `country === RecallCountry.us` in `RecallRadar.tsx`; `stateMapTitle` in `data.ts` and the
  aria-label in `components/RecallMap.tsx` are US-hardcoded. Decide whether the new country
  gets an equivalent or correctly falls into the generic layout.
- **Per-facet data gaps**: `components/Breakdowns.tsx` and `components/Outbreaks.tsx` carry
  country-conditional rendering for missing facets (Canada has no company/geography data,
  South Africa no classifications — see their comments). If the new country's feed lacks a
  facet, walk both components and confirm each card degrades correctly.

## 5. Tests (extend the existing country tests, same change)

- `components/RecallFilters.test.tsx` — has per-country cases ("shows UK classifications…",
  "hides the company type-ahead… (Canada)"); add the new country's facet expectations.
- `components/LocationSelector.test.tsx` — selector surfaces the new country.
- `useTopics.test.tsx` / `useEvents.test.tsx` — refetch-on-country-change pattern.
- `subscription/useSubscriptionForm.test.ts` — form accepts the new country.
- Assert against the imported config records, not hardcoded lists.

## 6. Verify

`npm run check`, `npm test`, then the `visual-verify` skill: select the new country and walk
filters, search, breakdowns, and the subscribe form; check the empty states a fresh feed
produces (sparse data is the launch-day reality).
