# KeySuite V4.28.50 Upgrade

This release balances the first-page quotation spacing to two blank body-text rows from `Quotation` to `Project`, and two blank body-text rows from `Handled by` to `Dear Mr...`. The shared print rule applies to both Windows and macOS. The V4.28.49 round-button removal and dark navy page-2 item-header rule remain included.

Upload all contents of the V4.28.50 Upgrade package over V4.28.41, preserving the folder paths. For an earlier installation, use the Full package. Back up the installation first and preserve your deployment-specific `config.js`. No database migration is required.

After deployment, reload the application and confirm V4.28.50. Open a two-page quotation from Quote History. On page 1, confirm both requested gaps read visually as two blank body-text rows. Confirm the round button remains absent, the page-2 item-header rule remains dark navy, and macOS Safari still reports two pages.
