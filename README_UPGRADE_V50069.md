# KeySuite V5.00.69 UPGRADE

Baseline: KeySuite V5.00.68 FULL. Back up your site and copy the files in this upgrade ZIP over the matching paths. Refresh the service worker/browser cache after deployment. No Supabase schema or data migration is required; existing prices, quotations, permissions and records remain in place. Do not apply the prior V5.00.68 migration again if it has already been applied.

Changes: G navigation and table, G curve/detail page with phase-linked variants, source-specific 3-page PDFs, BSW phase identity synchronization, and release metadata/cache.

Source limitations: The G workbook has performance points for G32-10-2 only (M/T phase variants). Other G variants have no supplied curve. The G price workbook contains zero M and T source prices, so automatic pricing still depends on Owner-entered values or the existing manual price workflow. The motor workbook lacks a motor price column. G Pg 2 contains one example duty point for G32-10-2T; this release does not assign it to other models.

Verification: JavaScript syntax and targeted source checks; three PDF outputs generated with three pages each for G25-07-2M, G32-10-2M and G32-10-2T. An authenticated browser session, visual print QA, saved quotation round-trip and live deployment have not been executed. Review those in staging before production deployment.
