# KeyHQ avatar architecture — V4.29.24

## Implemented Phase 1

The supplied V4.29.23 building is a Canvas 2D projection, not a Three.js scene. Keep its original functions, floor coordinates, elevators, projector and permission-gated Level 8. A lazy ES module adds a transparent Three.js orthographic layer only on Level 6. Its projection matches the existing camera. Depth-only meshes reuse the exact furniture box coordinates emitted by the building; no second office layout is maintained.

- `controller.js`: validated profile schema, local movement, grid navigation and automatic decision scheduling. No network, authorization or renderer dependency.
- `prototype.js`: GLTF loading, independent animation mixers, cross-fades, UI, browser storage and camera bridge. Two clearly identified fictional prototype actors; these are not employee records.
- `assets/keyhq-original.glb`: original low-poly character, 15-joint shared skeleton, six reusable animation clips, selectable hair and clothing components. Each actor has an independent skeleton and materials; mesh buffers and animation clips are shared.
- `../vendor/`: locally bundled Three.js r170 and its matching GLTF / skeleton utilities, MIT license. No CDN dependency at runtime.
- Storage uses `keyhq:phase1:avatar:v1:0` and `:1`. Profiles are local to this browser origin, not tied to an account. No employee information is written to these keys.

The existing KeySuite authentication bridge remains authoritative for business access. Prototype actions only change visual state. They cannot create quotations, change permissions, send Telegram messages, issue RPCs or access production records.

## Future phases — design only, approval required

1. **Employee profile adapter:** replace the local profile store with a repository exposing `load(actorId)` and `save(actorId, validatedProfile)`. Map authenticated KeySuite account UUID + company UUID to an actor. Keep a separate `kind: employee | ai` field. Audit the existing V4.29.23 avatar schema before designing migrations. RLS must scope reads to the company and writes to the employee's own profile or explicit administrative permission. Never use an editable display name or user metadata as authorization.
2. **Multiplayer adapter:** accept actor snapshots with sequence number, authoritative timestamp, floor, position, facing and animation intent. Interpolate remote movement; do not transmit bones every frame. Use bounded update rates and only subscribe to authorized visible floors. Supabase private Realtime topics must enforce membership and floor permissions server-side. Validate speed, coordinates and chair reservations; reconnect using a fresh snapshot and refreshed authorization.
3. **AI decision adapter:** replace automatic demo scheduling with a queue of validated intents. Keep the animation mixer independent from KeyBot decision-making. Manual intent owns control until the user explicitly resumes automatic behaviour. Define cancellation, timeouts and audit records before connecting AI actors.
4. **Business-action gateway:** animation events are not authority. Quotation, pricing, external messaging and other business actions must call the existing permission-checked server workflow, with confirmation where required and idempotency/audit records. No service-role key in the browser.
5. **Multi-floor rollout:** only after the prototype is accepted, add navigation meshes, floor-specific interaction anchors, elevator handoff, LOD and occupancy streaming. Do not create all floor scenes or all employee meshes at startup.

## Validation gates before Phase 2

Approve visual proportions and outfits; verify sitting/typing alignment against actual employee desk counts; measure real Chrome and Safari GPU performance on the target hardware; validate company isolation with two accounts; test context loss, logout and channel reconnect; run quotation and pricing regressions; approve schema and rollout separately.

## References

- Three.js animation system: https://threejs.org/manual/en/animation-system.html
- Three.js GLTF loader: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- Supabase Realtime authorization: https://supabase.com/docs/guides/realtime/authorization

Supabase documentation was consulted for planning only. No new Supabase implementation, SQL, migration or production query is part of this release.
