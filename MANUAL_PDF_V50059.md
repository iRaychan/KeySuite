# KeySuite V5.00.59

V5.00.59 uses the supplied V5.00.58 full build as its sole implementation baseline. V5.00.56 served as the reference for the browser print workflow.

## Save a PDF

1. Click **PDF** in Product, Selection, Quotation, Quote History, on a quotation item, or in the KeyBot inbox. In the KeyHQ quotation preview, click **Print / Save as PDF**.
2. In the browser's print dialog, choose **PDF → Save as PDF** on Safari or **Save as PDF** as the destination in Chrome or Edge. If the browser opens the technical report in a background tab, select that tab to access the dialog. The report also has a **Print / Save as PDF** button to reopen the dialog.
3. Choose a location and save. KeySuite suggests the existing report name through the print document title. The browser controls the final filename. Selection Item No. advances when KeySuite hands the prepared report to Print. Browsers do not tell KeySuite whether you saved or canceled.

KeyBot inbox PDF uses the enquiry's existing KeySuite selector link and duty, so the browser prints the technical report rather than opening the previously generated Telegram attachment. Telegram's own attachment generation remains separate. Saved and sealed quotation checks continue to apply.

The V5.00.58 report templates, pump curves, engineering data, ISO Cold Item lookup, ES/ISO seal and O-ring pricing, and approved ES/ISO Page 3 drawing are retained. The app uses the browser's print engine for PDF output.

## Upgrade

Extract the upgrade ZIP over a copy of V5.00.58 and replace the matching files. The full ZIP can be extracted into a clean release folder. V5.00.59 requires no Supabase migration. The static site can use the existing publishing workflow after approval.
