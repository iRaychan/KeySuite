# KeyHQ integration verification

- KeyHQ appears in the main sidebar immediately after KeyBot.
- KeyCore is still injected after KeyHQ, preserving the requested order.
- KeyHQ uses the same teal gradient, border, glow, and icon treatment as KeyBot and KeyCore.
- Selecting KeyHQ opens `keyhq/index.html` inside a full-screen KeySuite overlay.
- Selecting KeySuite inside KeyHQ closes the overlay and returns to the existing KeySuite session.
- Escape also closes the KeyHQ overlay.
- KeyHQ remains available as a standalone page at `keyhq/index.html`.

Validation performed:

- JavaScript syntax checks passed for the launcher and KeyHQ application.
- V4.29.13 release and motor price-change regressions passed.
- Archive integrity and extracted-file checks are performed before delivery.
