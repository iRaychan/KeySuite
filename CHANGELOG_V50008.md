# KeySuite V5.00.08 — change log

Release date: 28 October 2026 (Asia/Kuala_Lumpur).
Baseline: the supplied `KeySuite_V5.00.07_FULL_CLEAN_GitHub.zip` only.

## 1. BGF direct quotation

The four BGF product rows now have Quote buttons, with no Stages column or model dialog. A quote uses the existing calculation engine, applicable currency selection, highest converted cost, existing factors and RM10 rounding. The normal quotation row receives quantity 1, editable capacity/head, Dashboard units, and a pricing snapshot that supports repricing. Changing duty values does not change the SKU price. Missing costs remain unavailable.

The separately approved BGF-only database upgrade adds an owner-authorized rule-saving endpoint. It writes only the BGF entry in an existing category's JSON rules, atomically including currency selection. It does not seed prices, change existing rules, or rename categories. BGF uses the existing shared currency-rate configuration. Existing product calculation algorithms are unchanged.

## 2. Compact Explore

Collapsing hides the complete tall panel. A persistent Explore KeyHQ + control sits immediately left of the existing camera bar in one centred, equal-height responsive row. Expanded content and Avatar Actions remain intact.

## 3. FREE/FOLLOW visibility

Obstructing architectural walls in FOLLOW retain a 0.18 m visible base. Original collision rectangles remain intact. The camera restores original wall matrices in FREE; relevant ceiling sections retain the established obstruction handling and doorway hysteresis. Furniture is excluded from wall cutaways.

## 4. Vehicle exits

Exit handling clears riding/pending states, restores manual walking, suppresses remounting from a stale session, and chooses a location outside the rotated vehicle footprint with walking clearance. Repeated exits no longer restart the dismount transition. Demo rides use the same vehicle objects without requiring an authenticated ride session.

## 5. Capsule vehicles

A bottom-bar Capsule control offers hoverboards indoors and existing vehicle types outdoors. A KeyHQ-designed capsule throw and smoke effect deploy an existing parked vehicle into a checked clear space. Return shrinks the vehicle and restores its original parking place. Occupied/session vehicles are unavailable; reuse prevents accumulating copies. The fixed effect pool is reused.

## 6. Smoking

The cigarette points away from the head with the filter nearest the mouth; smoke is emitted from its world-space ember. Both Carry controls and the existing smoking leisure activity use this attachment. Stop Activity removes the prop and particles. Avatar rotation is not changed to orient the cigarette.

## 7. Activity invitations

One checkbox row per eligible participant, Select All, Clear All, and one footer Invite button replace individual invitation buttons. Existing invitation calls are awaited. The dialog closes only on success; errors remain visible for retry. Successful individual invitations are disabled during a partial-failure retry.

## 8. Basketball

The original court location now has dark-blue/teal surfaces, Keylargo branding, court markings, transparent backboards, hoops and animated nets, an LED scoreboard, lighting, seating and planting.

Six modes have playable state and completion rules: free throws (10/20), five-position three-point contest, 1 vs 1, 3 vs 3, three dunk styles, and 30/60/120-second time attack. Controls support movement, sprint, power-based shots, jumps, pickup/pass, defensive steals, and exit. Auto play and AI team filling are available. AI avatars reuse the existing character asset at the same campus scale.

Existing host-authoritative game messages carry basketball state. Real participants remain in the validated player map; AI state is separate. No multiplayer schema change was introduced. Exiting restores manual control.

## 9–10. Access

Sports enclosures retain their original east entrances and gain west entrances. HQ gains glass side doors and short ramps on the sports and garden sides, with connecting paving. Geometry and collision gaps agree. The existing tower, main/rear entries and removed entrance pillar are preserved.

## 11. User monitor quotation history — additional requested correction

Monitor hit-testing now includes visible monitors in Campus view instead of requiring an exact selected floor. Monitor clicks also take priority over Walk Here movement. The existing authorized quotation-history dialog, employee filtering, search and Original PDF request remain in use. Missing email/status values no longer throw errors.

## Preservation

No baseline file was deleted. `app.js`, PDF implementation files, product curves, Assembly implementation, KeyBot and Messenger services, existing migrations and Edge Functions remain byte-identical to the supplied baseline. Changes to authentication data loading are limited to retaining the BGF category rule. Version metadata and the service-worker asset list are updated for V5.00.08.
