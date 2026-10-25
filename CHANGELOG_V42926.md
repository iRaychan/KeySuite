# V4.29.26 consolidated amendment — 26 October 2026

Continued from the saved master build; no restart from V4.29.25. The saved source is not a Git checkout. Changes were compared against the delivered master FULL CLEAN archive, which remains preserved.

## Six amendments

1. **Independent input:** only the selected, authorized local actor receives keyboard/joystick commands. Vehicle and game inputs use the same ownership boundary. Remote movement applies only to the authenticated user/session row; own and cross-company rows are ignored. Other avatars retain their own controllers.
2. **Cutaway walls replace transparency:** wall/window and floor/ceiling geometry is divided into independently hidden instances. View obstruction and local ceiling sections are removed from rendering; collisions and shared materials remain unchanged. A short restore delay prevents visibility flicker. The previous opacity shader and wall-distance contraction are removed.
3. **Visible carry actions:** hand-attached cigarette/filter/glowing ember, world-space dispersing smoke particles, shaped bottle with glass/liquid/label, alternating smoking/drinking arm motion, cleanup on Stop/indoor entry/sports/vehicles. Authenticated remote-state support shares carry choice through the deployed amendment migration.
4. **Camera stability:** removed the second building-envelope distance correction and the ray-hit zoom controller. Ordinary obstruction never changes the requested orbit radius. Follow survives camera zoom/rotation controls; Free keeps independent target control. A body-clearance guard and finite-coordinate recovery protect invalid views without changing movement mode or avatar position.
5. **Manual lifecycle:** persistent movement selection is distinguished from legitimate interaction ownership. Only the selected local actor receives stale-controller recovery. Vehicle/seat/game exits restore the chosen controller. Dialog/dropdown closure restores scene focus while typing and open dialogs retain keyboard ownership. Smart-action buttons include actor identity in their refresh key to avoid stale closures.
6. **Rendering stability:** one camera obstruction system, stable section matrices/materials, frame-time damping retained, and graphics-context restoration preserves scene state. No scene rebuild, avatar reset or Auto→Manual workaround is used for normal recovery.

## Database and delivery

The existing master migration 20261025113911 remains deployed. The additional avatar-state migration was explicitly approved, deployed as **20261025164217**, and verified on 26 October 2026 (Malaysia time). Its RLS, grants and Realtime publication passed inspection; security-advisor counts did not change. The earlier approval rejection is resolved. No GitHub or frontend deployment occurred.

See QA_V42926.md, REQUIREMENTS_STATUS_V42926.md, MODIFIED_FILES_V42926.md and README_UPGRADE_V42926.md.

---

## Preserved master implementation history

# KeySuite V4.29.26 — master revision changelog

## Campus and controls

- Retained the current coastal campus, three-floor headquarters, original Keylargo logo, saved employee appearances and existing business modules. Legacy eight-floor files remain retired.
- Top toolbar: Chat, Live Lighting, Map, People, Pan, Orbit, Reference and Quality. Take a Moment expands under Campus Overview in the left panel.
- Avatar Actions has three independent pairs: Auto/Manual, Eyes View/Camera and Follow/Free. Follow/Free are disabled in Eyes View. Eyes View is removed from the movement dropdown. The panel collapses, resizes and scrolls.
- Arrow-key manual control, proportional circular touch joystick and independent camera gestures. View changes preserve upright posture. Center Camera targets the selected avatar.
- Obstruction fading operates on individual mesh instances, approaches 22% opacity and restores opacity/material depth behavior. Solid walls also constrain camera distance.
- Shared ground/indoor navigation, front and rear door openings, bounded route retries and reachable facility destinations. New gradual entrance ramps join exterior and lobby elevations.
- Main entrance has dark frames, sign, canopy, warm lighting, solid grey walkway and proximity-operated sliding doors.
- Bottom action bar retains camera controls and displays nearby activity, vehicle, elevator, seat and carry actions. Activities offer Exit Activity; manual movement is restored.

## Playable activities

- Added player-controlled game engine with normalized movement, aim, hold/release power, ball trajectory, hoop detection and scores. Basketball offers practice, 1-on-1, 3-on-3 and 5-on-5 with team totals.
- Manual swimming, laps and timed/multiplayer race modes use horizontal posture, water-level motion, animated ripples, lap turns and safe pool-deck exit.
- Tennis, badminton and pickleball support practice, singles and doubles with court halves, hits, net/out faults and rally points. Football supports dribbling, shooting and scoring at either goal. Gym repetitions support individual and group modes.
- Existing employee identities and Messenger invitations drive membership. Client inputs and host snapshots share positions, action animations, ball state and scores. Waiting, stale-host, leave/end and session cleanup paths are implemented. There is no fake multiplayer fallback when the database is unavailable.
- These are casual campus games. Full regulation match systems and live multi-account acceptance remain outside the verified scope; see QA.

## Interactions and vehicles

- Smoke, Beer and Both create hand props and arm animations outdoors/on the roof; Stop Activity clears them. Walking can continue while carrying. Indoor entry clears the props.
- Three indoor hoverboards at lobby, desks and lift; bicycle parking outside the entrance. Scooters and golf carts remain outdoors. Walking-relative speeds remain 2/3/4/5; scooter capacity 2 and cart capacity 4.
- Rotated vehicle footprint and swept collision replace oversized cart clearance. Rider roots stay aligned to seats. Safe dismount restores previous movement choice. Hoverboards can travel in the lift and share floor/elevation.
- Lift exit restores manual movement without toggling modes.
- Registered chair, sofa, bench and lounger anchors provide facing, local occupancy, hip alignment and safe stand positions; stationary workstation and autonomous seating adopt nearby anchors.
- Preserved refined full-body character assets and saved profiles; added run animation and linked sport actions to input events.

## Preserved integrations and delivery

- Approved compact/expanded phone Messenger implementation remains byte-identical. Existing messaging and group features are retained; its Supabase adapter additionally carries game updates.
- Malaysia UTC+8 Live lighting and Daylight/Night/Golden presets retained.
- Quotation monitor resolves customers through the existing authoritative Quotation History resolver. No hardcoded customer names or quotation rewrites.
- Master-specific cache generation, regression evidence, guarded upgrade helper, full source/upgrade archives and deployment receipt included.
- Master Supabase migration deployed as 20261025113911_keyhq_v42926_playable_campus. No GitHub or frontend-hosting deployment.
