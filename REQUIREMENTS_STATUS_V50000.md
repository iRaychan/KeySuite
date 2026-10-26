# V5.00.00 requirements status

| Requirement | Status |
|---|---|
| Original V4.29.26 master requirements | Preserved in the inherited source and rechecked with the existing regression suite |
| Independent avatar movement | Preserved; browser and movement regressions pass |
| Automatic cutaway walls | Preserved; cutaway regression passes and wall-opacity behavior is not restored |
| Smoke / Beer / Both | Preserved; prop attachment, particles and cleanup regressions pass |
| Camera clipping / zoom recovery | Preserved; camera and recovery regressions pass |
| Reliable Manual mode | Preserved; direct mode switching and stale-lock recovery regressions pass |
| Walking jitter / glitch / rendering fixes | Preserved; stability, physics and remote-state regressions pass |
| KeySuite Messenger beside Important Note | Implemented and browser-tested in installed Chrome; the included WebKit target was unavailable locally |
| Same compact phone and Duo view | Shared `PhoneChat` component; compact/expanded transitions browser-tested |
| Shared Supabase conversations / unread state | One adapter, one Realtime subscription set and the existing protected tables; local integration test passes |
| Existing KeySuite features | Source retained; selected legacy and V4.29.26 regressions pass |
| Original Keylargo logo | Byte-identical to the V4.29.26 baseline |
| V5.00.00 identifiers | Updated in page metadata, global build value, visible labels, PWA manifest, service worker and late version lock |
| FULL CLEAN / UPGRADE ZIPs | Generated with SHA-256 manifests and archive verification |

Production hosting, GitHub publication, physical-device testing and a real two-account chat exchange are intentionally not claimed by this package.
