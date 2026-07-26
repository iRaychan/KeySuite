# KeySuite CHC Testing v0.1

A browser-based testing dashboard for:
- Customer records
- CHC duty-point selection
- Pump head curve
- Quotation creation
- Draft/Sent/Won/Lost status
- Saved quotation history
- Print / Save PDF
- Offline/PWA support

## Run
Upload all files to a GitHub repository, then enable GitHub Pages from the main/root branch.

You can also open index.html locally, but browser local-storage behavior is more reliable through GitHub Pages.

## Important
This version contains only a small SAMPLE CHC_DATA set in app.js.
Replace CHC_DATA and the runSelection function with the frozen completed CHC Selector database/engine.

Customer and quotation records are stored in the current browser using localStorage.
They do not sync between devices and can be lost if browser site data is cleared.
