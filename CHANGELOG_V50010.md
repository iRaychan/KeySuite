# KeySuite V5.00.10 — 21-change implementation log

Continued from the existing modified V5.00.10 workspace based on V5.00.09. No baseline files deleted. Release date: 28 October 2026 (Asia/Kuala_Lumpur).

## 1. Basketball movement recovery

Recover manual movement while shared game initialization/configuration is unavailable; retain WASD/arrows, scoring and existing game modes.

Evidence: `tests/v50010/acceptance.cjs; basketball.mjs`.

## 2. Original white court logo

Use the unchanged original logo texture through a white artwork mask; preserve its aspect ratio and blue court.

Evidence: `tests/v50010/court.png; asset comparison`.

## 3. Center-circle proportions

Reduce center circle and logo together without moving other court markings.

Evidence: `tests/v50010/court.png; source review`.

## 4. Lamppost clearance

Move obstructing road/walkway poles and their colliders together to adjacent edges.

Evidence: `tests/v50010/regression-browser.cjs entrance checks; source review`.

## 5. Activity camera

Save and restore zoom/orbit/floor state; avoid forced maximum zoom when starting an activity.

Evidence: `tests/v50010/acceptance.cjs`.

## 6. Manual/Auto control

Keep the signed-in avatar manual despite delayed presence; schedule independent NPC activity only in Auto.

Evidence: `tests/v50010/acceptance.cjs delayed-presence and mode tests`.

## 7. Corporate desks

Retain workstation coordinates and assignment points; add walnut surfaces, metal legs, cable trays, slim displays and ergonomic chairs.

Evidence: `tests/v50010/desks.png; source review`.

## 8. Avatar upgrade

Rebuild rounded character geometry, gender-dependent head/body proportions, facial details, hair and outfit accessories; share appearance application between preview and campus.

Evidence: `tests/v50010/acceptance.cjs: every selector, four colors, save payload and simulated-service reload`.

## 9. Indoor staircase

Add continuous switchback walking heights, wood treads, glass guards and metal trim; route NPCs on adjacent-floor stairs while preserving the lift.

Evidence: `tests/v50010/acceptance.cjs manual up/down and NPC route`.

## 10. Editable product descriptions

Keep multiline text edited by the user and serialize it exactly through reopen, including BFI/BGF/KeyPLC.

Evidence: `tests/v50010/quotation.cjs; regression-quotation-layout.cjs`.

## 11. Quotation brands

Collect actual metadata, including nested Pumpset/System components; retain distinct brands, avoid duplicate printed names and omit unknown brands.

Evidence: `tests/v50010/quotation.cjs nested brand and print checks; product-browser.cjs`.

## 12. Manual items and capacity

Add mixed manual/database items with optional brand/capacity, editable unit, quantity, selling price and existing totals.

Evidence: `tests/v50010/quotation.cjs copy/delete/reorder/roundtrip/PDF`.

## 13. Stable Model / Item editing

Stop brand synchronization from rewriting manually edited values or moving their cursor; preserve IDs and pricing metadata.

Evidence: `tests/v50010/quotation.cjs beginning/middle/end edits and exact roundtrip`.

## 14. Revision references and dates

Use a server-side revision branch with source/ownership checks and advisory locking; allocate R1/R2/R3 without normal numbers, inherit Original Date and store Revised Date independently.

Evidence: `tests/v50010/Connected database rollback test; quotation.cjs PDF/history/date tests`.

## 15. Brand ordering

Use B.G.Reich first, Task second, other names A–Z and blanks/hyphen last in Dashboard and Brand Assigned. Preserve actual names.

Evidence: `tests/v50010/quotation.cjs comparator; integration source review`.

## 16. Valid diving poses

Raise the approved server pose ceiling to 31 m for the 30.2 m platform; recover nonfinite local coordinates.

Evidence: `tests/v50010/regression-browser.cjs all platform climbs and nine dives; campus-extra.cjs; database definition verification`.

## 17. Seated leisure props

Add coffee cup, beer bottle, hand reach/pickup/drink/return cycle and cigarette smoke while keeping seating state.

Evidence: `tests/v50010/campus-extra.cjs four prop modes and bounded smoke particles`.

## 18. Ride Vehicle button

Call the existing nearby-vehicle entry/exit path; retain proximity/speed/access checks and separate passenger invitations.

Evidence: `tests/v50010/campus-extra.cjs animated mount/dismount`.

## 19. Walking-in-place recovery

Use actual movement to choose idle/walk; retry obstructed routes with a bounded retry limit and idle on failure.

Evidence: `tests/v50010/campus-extra.cjs blocked-route and empty-path tests`.

## 20. Visitor KeyBots

Use existing company selection-scope assignments, reuse avatar identity, remove employee desk assignments for visitors and restrict routes to public areas.

Evidence: `tests/v50010/acceptance.cjs assignment transition/deduplication; campus-extra.cjs office and ownership denial`.

## 21. Follow camera cutaway

Hide upper floor groups, ceilings and roof while retaining current workspace; restore visibility in Free/outside and retain wall cutaways.

Evidence: `tests/v50010/campus-extra.cjs; regression-browser.cjs`.

See VERIFICATION_V50010.md for the precise scope and limits of the evidence. Historical changelogs describe earlier releases.
