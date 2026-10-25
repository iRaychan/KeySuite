# Current campus character system

The active campus uses a local original GLB built by `avatar-build-tools/build-avatar.mjs`. It is a smooth stylized full-body character with a 15-bone rig, six base clips and additional procedural skeletal clips. Facial details and appearance accessories attach to the head/hand/hips bones through `extensions.js`. Account identity and profile persistence remain in the existing parent-frame `avatar-sync.js` adapter; no demo actors are instantiated.

`rig.js` clones skeletons and per-character materials, shares immutable geometry, applies appearance, cross-fades clips and releases resources. Both the studio preview and campus use the same asset and decoration code. Procedural animation is intentionally stylized, not motion-captured realism.

Movement ownership is coordinated by `campus/main.js`, `movement.js`, `elevator.js`, `vehicles.js` and `leisure.js`. Online users control only their own account. Offline background activity is a local presentation of existing employee accounts, not a record of a person's real-world activity.
