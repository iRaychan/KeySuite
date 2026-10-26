# KeySuite V5.00.01 changes

Base: user-supplied KeySuite_V5.00.00_FULL_CLEAN_GitHub.zip only.

- KS-01: CHC C4/G1 uses included IE2; C6/G2 uses included IE3. Selecting that motor adds nothing. Alternative efficiencies use the existing exact motor lookup and final-to-final replacement calculation. Carry its delta into assembly subtotals as well. Apply the stated included motor baseline at all pump sizes; preserve explicit alternative selections and missing-price safeguards.
- KS-02: Carry the fixed RM1,000 shelter charge into `beforeFuel`, the subtotal actually consumed by assembly rows, consolidated assembly totals and quotations. Panel line quantity multiplies this once per panel; number of pumps served does not multiply it. Existing controls and persisted enclosure selection are retained.
- KS-03: Carry existing accessory add-ons into the same assembly subtotal. Keep the existing unit price sources and one accessory per pump calculation; deselection and quantity changes recalculate from source.
- HQ-01: Preserve the owner's selected movement mode across presence refreshes. Only change button class/ARIA attributes when their value changes; eliminate per-frame attribute churn. Temporary activity locks do not redefine selected mode.
- HQ-02: Adjust the left-hand beer grip, elbow/shoulder lift and bottle tilt cycle; return to holding angle. Right-hand smoking geometry and animation calculations are unchanged.
- HQ-03: Autonomous sessions use the existing autonomous activity controller instead of the keyboard-input game controller. Restore auto control after timed activities and seating transitions. Keep route retries, retry delays, identities, appearances and authenticated remote control rules. No following is added.
- HQ-04: Remove avatar occupancy from walking, rerouting and standing/dismount space checks. Keep world/furniture and vehicle collision rules. Unoccupied bicycles ignore stale remote movement. Turn the bicycle in place at its original coordinates to clear the entrance furniture footprint; rider and bicycle remain attached.
- HQ-05: Add coordinated continuous swimming strokes and alternating leg kicks. Apply heading before body pitch, blend posture and entry movement, and route pool exits back to the deck instead of teleporting. Keep pool appearance.
- HQ-06: Solo selections start directly. Invite appears immediately below Leisure and uses the existing participant interface. Activity modes requiring multiple players show participant selection and enforce the required count before sending. Existing invitation acceptance and private-session rules remain.
- HQ-07: Add one shared staircase and 1/3/5 m landings, positioned between existing pool furniture. Level selection routes the avatar to the stairs, climbs, traverses the platform, jumps/dives, splashes, resurfaces and starts the existing swimming activity. Manual mode cancels safely to the deck.

## Preservation
No database, account, permission, employee identity, avatar asset, original logo, pool geometry, quotation history, numbering, Telegram or KeyBot changes. All `supabase/` files are byte-identical to the input archive. No new database migration or Edge Function deployment is required. No production action was taken.

The full package retains historical tests/documentation from the base; only `tests/v50001/results` records this build's new test runs. Test fixture identities exist only in local tests and are not inserted into application or database data.
