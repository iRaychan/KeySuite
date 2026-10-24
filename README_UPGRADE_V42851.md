# KeySuite V4.28.51 Upgrade

This release fixes two Quick Selection regressions.

- CHC C6 waits for its first visible-frame stabilization before the selected model request is sent. The first click on CHC 2-90 now opens the curve directly.
- Ticking **Cold Item** now includes unpriced BFI models in the normal hydraulic suitability order. Price availability no longer pushes BFI 10-3 ahead of the more suitable BFI 10-2 for 18.3 IGPM at 82 ft.

Upload all contents of the V4.28.51 Upgrade package over V4.28.41 or later, preserving folder paths. For an earlier installation, use the Full Clean package. Back up the installation first and preserve the deployment-specific `config.js`.

No database migration or Edge Function deployment is required. After deployment, reload KeySuite and confirm V4.28.51.
