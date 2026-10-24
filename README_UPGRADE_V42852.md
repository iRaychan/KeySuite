# KeySuite V4.28.52 Upgrade

This release corrects the remaining BFI Cold Item Quick Selection behavior.

When **Cold Item** is enabled, KeySuite now keeps the priced recommendation's BFI hydraulic series as the anchor, then re-ranks all suitable stages in that series. For `18.3 IGPM @ 82 ft`, a priced BFI 10-3 anchor therefore selects the suitable cold `BFI 10-2`; it does not remain on BFI 10-3 or switch globally to BFI 4-5.

The V4.28.51 CHC first-click curve fix remains included.

Upload all contents of the V4.28.52 Upgrade package over V4.28.41 or later, preserving folder paths. For an earlier installation, use the Full Clean package. Back up the installation first and preserve the deployment-specific `config.js`.

No database migration or Edge Function deployment is required. After deployment, reload KeySuite and confirm V4.28.52.
