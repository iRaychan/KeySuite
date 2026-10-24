# KeySuite V4.28.53 Upgrade

Power calculations remain fifth-order polynomial fits. This release improves the visible curve only: the estimated non-zero Power value at zero flow now connects to the first positive-flow source point through a bounded quintic Hermite bridge. The bridge matches value, slope and curvature at the join, producing a smoother C2 transition without moving any source point or changing selection, duty calculations, or motor sizing.

The same display method is used by CHC C4/C6, BFI Selection/Product and ES. The V4.28.52 BFI Cold Item and V4.28.51 CHC first-click fixes remain included.

Upload all contents of the V4.28.53 Upgrade package over V4.28.41 or later, preserving folder paths. For an earlier installation, use the Full Clean package. Back up the installation first and preserve the deployment-specific `config.js`.

No database migration or Edge Function deployment is required. After deployment, reload KeySuite and confirm V4.28.53.
