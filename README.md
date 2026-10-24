# KeySuite V4.29.25 Full

Continues from V4.29.24. All enabled workforce characters now reuse Maya and Adam's original shared 3D rig. Adds self-only account appearance profiles, Realtime appearance refresh and one responsive Workforce/Location sidebar. The eight-floor building, original logo, business modules, quotation PDFs and existing permissions are preserved.

Start with [upgrade and database instructions](README_UPGRADE_V42925.md) and [test results](VERIFICATION_V42925.md). The supplied migration has not been applied to production. The FULL archive is the complete project; the UPGRADE archive contains only the changed/new files. Historical release notes below are retained for reference and are not current deployment instructions.

## Historical V4.29.23 release

## V4.29.23 - KeyHQ architectural office

Built strictly from the V4.29.22 full package. This release adds the completed KeyHQ V0.5 architectural office, elevator-only floors with enclosed toilets, readable contextual desk labels, stable single-click monitors, in-KeyHQ original quotation PDF viewing/download/print, camera recentering, persisted self-service avatar customization and animated leisure activities. Apply the supplied V4.29.23 avatar migration separately after review.

## KeyHQ V0.2 - Living Headquarters visual redesign

KeyHQ now presents a distinctive Sims-style isometric headquarters instead of a repetitive glass tower. The eight-level program and true Levels 1–2 podium remain intact, while stepped upper volumes, a warm vertical spine, planted terraces, richer landscape, destination rooftop and upgraded day/sunset/night lighting give the building a coherent identity. Level 5 is now a detailed KeyBot Telegram AI operations center with seven workstations, a three-screen operations wall, server equipment and a refined human avatar. The original `keylargo-logo.png` is drawn without recoloring. Existing KeySuite session, role, live company inbox, floor configuration, quotation, pricing and selector behavior is unchanged. See `README_UPGRADE_KEYHQ_V0.2.md` and `VERIFICATION_KEYHQ_V0.2.md`.

## KeyHQ V0.1 - Master Building structural shell

KeyHQ now presents the approved eight-level Master Building: a taller shared Levels 1–2 podium for reception, KeyLab and warehouse; dedicated showroom, wellness/social, KeyBot, 28-desk KeyOffice, 38-seat conference and owner levels; aligned lift/stairs; and an equal basketball/social rooftop split. Sunset/night views and the original Keylargo logo are retained. This is a presentation-layer upgrade only: existing KeySuite and Supabase behavior is unchanged. See `README_UPGRADE_KEYHQ_V0.1.md` and `VERIFICATION_KEYHQ_V0.1.md`.

## V4.29.22 - Manufacturer-correct tyre coupling selection

Tyre coupling selection now evaluates both valid F/H flange orientations using motor torque, operating speed, shaft diameters, Taper-Lock bush capacity and the coupling manufacturer's flange-specific bore limits. ES 32-13 with a 40 HP 4-pole motor therefore selects F80 with pump H/2012 and motor F/2517, without a pump-model exception. Pricing, BOM construction, layouts and all V4.29.21 features are preserved. See `README_UPGRADE_V42922.md`, `CHANGELOG_V42922.md` and `VERIFICATION_V42922.md`.

## V4.29.21 - Truthful, company-scoped KeyHQ

KeyHQ now distinguishes live, connected-empty, demo, locked and unavailable sources; displays evidence-backed agent signals instead of simulated progress; securely scopes projector enquiries to the signed-in company; supports saved Owner/Admin floor expansion; and restores the original Keylargo logo to the headquarters itself. All V4.29.20 quotation corrections are preserved. See `README_UPGRADE_V42921.md` and `CHANGELOG_V42921.md`.

## V4.29.20 - Atomic save allocation and compact browser backup

Quotation previews are non-consuming and database-authoritative, first saves allocate the company-wide number atomically, later saves retain the same record and number, and the Safari fallback cache is now bounded and image-free. See `README_UPGRADE_V42920.md` and `ROOT_CAUSE_V42920.md`.

## V4.29.19 - Unified secure quotation history

- Lists valid current-only quotations together with archived quotation versions, with reference-level deduplication.
- Preserves full company quotation visibility for owners and creator-only visibility for other accounts.
- Keeps live Supabase history available when the browser cannot update its local backup because storage is full.
- Blocks quotation saves while secure synchronization is unavailable, preventing local-only records from being reported as securely saved.
- Repairs the legacy quotation-counter registration SQL ambiguity.
- Requires the included Supabase migration. No Edge Function deployment is required.

## V4.29.18 - Safari post-authentication freeze correction

- Fixes the self-triggering version-label observer that starved Safari's JavaScript task queue after Supabase had already accepted a login.
- Makes late version updates idempotent and coalesces repeated mutations to one animation frame.
- Adds deadlines to all awaited protected-data and module initialization stages.
- Rotates the service-worker cache so Safari cannot reuse the defective V4.29.17 startup runtime.
- Preserves all KeyHQ, quotation, pricing and selector functions.

## V4.29.17 - Safari authentication startup recovery

- Prevents Safari from remaining indefinitely on “Checking existing session…”.
- Pins the browser Supabase client to 2.118.0 instead of loading a moving major-version URL.
- Uses Supabase 2.118.0 lockless Auth coordination and completes the initial session read before registering the authentication-state listener.
- Aborts stalled Auth requests after six seconds, applies an eight-second startup ceiling, and replaces a timed-out client before enabling sign-in.
- Preserves all V4.29.16 quotation integrity corrections and the integrated KeyHQ module.

## V4.29.16 - Quotation integrity and native KeyHQ

- Concurrent quotation saves automatically take the next available company running number.
- New quotations and updates are distinguished explicitly; item quantities are normalized and restored.
- Owners can view and edit all company quotations; assigned users can view and edit only their own.
- KeyHQ is a lazy-loaded native KeySuite module with eight expandable floors, rooftop basketball and futsal, shared login/roles, Level 3 KeyBot enquiry animation, role-gated message projection, Sims-style idle activities, Kuala Lumpur automatic day/night lighting and manual previews.
- The existing `keylargo-logo.png` is used unchanged and illuminated only with runtime glow styling.

Complete clean source package continuing from V4.29.16.

## V4.29.15 - Quotation workflow and C4 layout amendments

- Keeps the corrected IE2-to-IE4 unit price but removes the internal motor-adjustment line from the customer quotation description.
- Atomically claims quotation numbers at save time; a conflicting browser receives the next four-digit number and must save again.
- Marks manually amended descriptions yellow while preserving valid pricing and allowing save and seal.
- Carries a plotted CHC Product duty point into the quotation capacity/head fields and PDF.
- Applies the standard responsive Selector container to CHC C4 so its first-open Safari layout does not depend on switching to C6.
- Requires the included Supabase migration. No Edge Function redeployment is required.

## V4.29.14 - Final-to-final motor replacement pricing

- Calculates a complete-pump motor substitution as `existing pump final - included motor final + replacement motor final`, followed by RM10 upward rounding.
- Keeps bare-shaft deduction on the existing raw included-motor-cost rule.
- Preserves the motor-adjusted package price when the Brand pricing layer stamps the quotation row.
- For the verified Smartech CHC 8-4 example, IE2 RM530 to IE4 RM870 changes RM1,750 to RM2,090 and shows `+RM340.00`.
- Requires no Supabase database migration or Edge Function redeployment.

## V4.29.13 - Motor price changes and KeyHQ

- Keeps KeyHQ in the main sidebar between KeyBot and KeyCore.
- Includes the multi-storey KeyHQ building with departments, elevator movement, AI employee activity, tasks and approvals.
- Applies CHC efficiency changes using the exact included and replacement motor records.
- Blocks a higher-efficiency quote when its source motor price is not higher than the included motor, instead of silently showing the same price.
- Ensures a genuine efficiency upgrade produces at least one visible RM10 quotation step when normal rounding would hide the difference.
- Adds the IE replacement price adjustment to the quotation item description.
- Requires no Supabase database migration or Edge Function redeployment.

## V4.29.12 - CR Customer assignment visibility

- Adds `CR` as an independent B.G.Reich row under Key → Customer → Brand / Series Price Preference.
- Allows a Price-authorized CR row to appear in Customer Curve / Quick Selection preference.
- Allows assigned CR to appear in Dashboard Quick Selection.
- Keeps all V4.29.11 KeyBot search, Telegram access and five-point curve behavior unchanged.
- Requires no Supabase database migration and no Edge Function redeployment.

## V4.29.11 - KeyBot access, scoped search and multi-point curves

- KeyBot Fast Search treats `CHC` as the shared CHC hydraulic family across all curve-enabled Brand / Series entries available through the user's Role or linked Company assignment.
- `CHC` and `VMS` use the same assigned CHC hydraulic scope.
- `CHC 2` searches only hydraulic CHC 2 models within that assignment scope; `BFI 10` likewise searches only BFI 10.
- `ES` searches both 2 Pole and 4 Pole; `ES 2P` and `ES 4P` restrict the search to the selected pole.
- Exact `CHCS` models use SS304 identity and exact `CHCN` models use SS316 identity on the generated curve.
- Accepts up to five Flow @ Head rows, sizes one suitable model across every point, and plots D1 through D5 on one curve report.

- Prevents unassigned Telegram senders from seeing Customer, Product, Selection or New Request controls.
- Removes any existing KeyBot reply keyboard for an unassigned sender.
- Replies: `Your Telegram account is not assigned yet.` followed by `Please contact your administrator to request access.`
- Keeps the sender registered and visible for administrator assignment.
- Requires a redeploy of `supabase/functions/telegram-webhook`.
- Requires no database migration.

## V4.29.10 - model pricing coverage, fuel journey and rarity

- Replaces `CHC Models` with `Models`, counting distinct product models across every loaded family.
- Replaces `Priced Variants` with `Models With Price`, counting each model once when any stored USD, RMB or MYR field is populated.
- Adds editable Fuel Efficiency (default 6.3 km/L) and Return Journey (Yes/No) under General Pricelist → Fuel Settings.
- Calculates Fuel Charge as `(Distance × Journey Multiplier ÷ Fuel Efficiency) × max(Current Fuel − Base Fuel, 0)`, using multiplier 2 for Return Yes and 1 for No.
- Makes rarity model-variant based across USD, RMB and MYR. Existing conflicts retain a unanimous rarity, otherwise use priced currencies with precedence Fixed > Rare > Many > Common.
- Restores the floating bottom-right Back button when Quotation is opened from any Selection page.
- Keeps quotation running numbers continuous while secure history loads, including across month changes and legacy `/` references.
- Requires `supabase/migrations/20261018150000_v42906_fuel_and_model_rarity.sql` and a redeploy of `telegram-webhook`.

## V4.29.05 - macOS CHC C4/C6 PDF and Selection fit

- Opens the CHC C4/C6 Product PDF in a visible report tab before the macOS print/save dialog, matching Selection.
- Removes the hidden desktop print frame that could make Product PDF saving appear stalled.
- Adds late macOS Safari fit checks so Selection C4/C6 reliably returns to the full-width zoomed-out view.
- Keeps the report content, values, layout, branding and all unrelated UI and behavior unchanged.
- Requires no database migration or edge-function deployment.

## V4.29.04 - CHC C4/C6 PDF preparation performance

- Prepares the selected CHC dimension drawing and PDF images in idle time after results render.
- Reuses the exact dimension-alignment result and optimized image cache when PDF is requested.
- Keeps the existing CHC C4/C6 PDF content, values, layout, branding and print behavior unchanged.
- Leaves every non-CHC selector and all calculations, data, UI, pricing and actions unchanged.
- Requires no database migration or edge-function deployment.

## V4.29.03 - Motor HP display precision

- Shows motor HP below 1 with two decimal places, including `0.50 HP` and `0.75 HP`.
- Shows motor HP of 1 or above without unnecessary trailing zeros, including `1 HP` and `1.5 HP`.
- Preserves the existing kW display, selector calculations, data, UI and behavior.
- Applies consistently to CHC C4/C6, CHC G1, BFI and CR selector result and Product displays.
- Requires no database migration or edge-function deployment.

## V4.29.02 - ES/BFI Product alternative recommendations

- Restores the existing Alternative Models recommendations in ES Product curve views.
- Restores the existing Alternative Models recommendations in BFI Product curve views.
- Remeasures embedded selector height after Orifice expansion, result rendering and alternative rendering so Windows can scroll to the complete content.
- Keeps CHC and CR Product curve alternative panels hidden.
- Reuses the existing selector candidates without changing hydraulic calculations, ranking or data.
- Preserves layout styling, pricing, Product actions and PDF behavior.
- Requires no database migration or edge-function deployment.

## V4.29.01 - Assembly BOM pricing-row alignment

- Top-aligns Model / Item, Qty, Unit Price and Total Price labels and controls in the shared BOM main row.
- Applies the correction consistently to Pump, Motor, Coupling and Baseplate.
- Keeps the Fuel share note below Unit Price without pulling the Unit Price label and input above the other columns.
- Preserves input widths, BOM values, pricing calculations, component details and frozen PDF behavior.
- Requires no database migration or edge-function deployment.

## V4.28.75 - immediate initial CHC curve render

- Accepts the unified selector readiness flag during the Dashboard Quick Selection handoff.
- Removes the erroneous 4.5-second first-open fallback wait for CHC models such as CHC 15-3.
- Retains compatibility with the legacy CHC-specific readiness flag.
- Preserves selector data, curves, calculations, pricing, layouts, frozen PDF, Assembly, Quote and permissions.
- Requires no database migration or edge-function deployment.

## V4.28.64 - shared Fuel across visible BOM prices

- Divides the single highest Assembly/System Fuel Charge equally by the number of visible BOM lines.
- Uses a dynamic divisor: four BOM lines divide Fuel by four, three divide by three, and two divide by two.
- Recalculates and rounds each displayed BOM unit price after adding its shared Fuel allocation.
- Makes the visible BOM line totals add exactly to the displayed Consolidated Total.
- Shows each line's allocated Fuel share without changing the saved standalone component price.
- Keeps quotation Set/Final Discount consolidation and nested System leaf pricing unchanged.
- Preserves frozen PDF/quotation print layouts and requires no database migration.

## V4.28.63 - Assembly/System consolidated pricing correction

- Displays the consolidated Assembly/System price before Set Discount, matching the component prices shown in the BOM.
- Reprices the Quotation handoff separately so each leaf retains its Set Discount and normal Final Discount logic.
- Sums all Transport contributions and applies only the single highest Fuel Charge.
- Flattens nested Pumpset/Assembly BOMs once so System pricing cannot double-count wrapper and leaf values.
- Uses the saved component pricing snapshot when a catalogue/configuration record cannot be re-resolved, instead of silently reverting to a displayed-price sum.
- Preserves frozen PDF/quotation print layouts.
- Requires no database migration.

## V4.28.62 - CR selector desktop-scale repair

- Keeps the embedded CR Selection page at the same desktop scale as CHC.
- Applies the proven visible-width first-open stabilization to both CHC and CR.
- Prevents Safari text inflation and stale hidden-iframe sizing from making CR appear zoomed.
- Constrains the CR header, duty panel, result cards and curve grid to the available KeySuite width.
- Preserves CR hydraulic data, ranking, models, pricing routes, PDF output and actions.
- Requires no database migration.

## V4.28.61 - CR Selection alignment with CHC

- Moves CR into Selection → B.G.Reich beside CHC C4, CHC C6, BFI and ES.
- Reuses the CHC Selection page structure and configuration workflow for CR.
- Keeps selected models, alternatives, curves and routed payloads in CR context using the independent CR engineering data.
- Fits the CR selector to the KeySuite content width without clipped actions, cards or horizontal overflow.
- Standardises the CR action row to PDF, Assembly and Quote.
- Keeps frozen PDF and quotation print layouts unchanged.
- Requires no new database migration.

## V4.28.60 - Selection, navigation, Baseplate and history refinements

- Responsive CHC/CR Mechanical Seal Add-On editors with a 288px maximum input width.
- ES Baseplate action-row cleanup and correct 2\" × 4\" → frame 100 BOM mapping.
- Isolated CR/CHC Product curve route state.
- B.G.Reich CR Selection with flow/head duty, hydraulic matching, curve and Assembly/Quote actions.
- Live Quotation History search for project, customer, quotation number and available model/product values.
- Frozen PDF and quotation print layouts remain unchanged.

- Includes the amended CHC C4/G1 V1.3 hydraulic data and CHC G1 price updates.
- Replaces Product → CR Price List with a CHC-style CR/CRS/CRN product search and selector using `004 - CR 261003 - V1.0.xlsx`.
- Keeps the CR Price List editor available separately under Price List.
- Makes all CR Mechanical Seal Add-On values owner-editable and uses the saved MYR values in CR quotation pricing.
- Reduces the Mechanical Seal Add-On input columns to approximately half width for both CHC and CR.
- Requires `supabase/migrations/20261005090000_v42858_cr_mechanical_seal_addons.sql` when upgrading from V4.28.57.
- Retains all V4.28.57 behavior outside these requested CHC/CR changes.

## V4.28.57 - CHC G1 update and editable Mechanical Seal Add-On

- Updates CHC C4/G1 from `004 - CHC G1 261003 - V1.3 - CHC 32 Amend.xlsx`.
- Replaces the CHC 32 flow, efficiency, NPSHr, head-per-stage, secondary-efficiency and secondary-head source series in both the shared and standalone selector data.
- Adds a Mechanical Seal Add-On table to the CHC Price List for Ca SiC, SiC SiC and TC TC.
- Keeps separate, owner-editable MYR add-on values for CHC C4/G1 and CHC C6/G2.
- Uses the saved generation-specific add-on automatically when CHC quotation prices are calculated.
- Requires `supabase/migrations/20261004190000_v42857_chc_mechanical_seal_addons.sql`.
- Retains the V4.28.56 universal zero-flow Power rule and all earlier behavior/layout.

## V4.28.56 - universal zero-flow Power rule

- Sets generated Power Point 1 at `Q = 0` to exactly `Power[1] × 0.68` for CHC C4/C6, BFI, and ES curves.
- Uses a third-order polynomial for Power curves across CHC C4/C6, BFI, ES, enhanced curves, and generated PDFs.
- Leaves every positive-flow Power source point and all flow, head, efficiency, NPSH, interpolation, selection, and motor-sizing data unchanged.
- Applies the same rule to interactive curves and generated KeySelector/KeyBot PDF curves.
- Preserves the existing frozen PDF/print layout.

## V4.28.55 - CR Price List and Category Pricing

- Adds CR / CRS / CRN to the main Price List dashboard.
- Adds CR as its own Category Pricing sector in Category Management and Company & Pricing.
- Adds an owner-only CR Category Pricing save function and allows CR currency selection per category.
- Requires `supabase/migrations/20261001203000_v42855_cr_category_pricing.sql` after the V4.28.54 CR migration.

## V4.28.54 - B.G.Reich CR Price List

- Adds Product → B.G.Reich → CR with the CHC-style CR / CRS / CRN price editor.
- Imports 439 unique CR models and their RMB/MYR prices and per-variant rarity from `010 - CR (Pricelist) - 261001 - V1.0.xlsx`.
- Includes the workbook's CR mechanical-seal add-on reference table.
- Adds independent CR USD and RMB multipliers and a database-backed owner save workflow.
- Shows both CR and BFI in General Pricelist → Effective Product Exchange Rates.
- Requires `supabase/migrations/20261001190000_v42854_cr_pricelist.sql`.
- V4.28.53 curve, BFI ranking, and CHC first-click fixes remain included.

## V4.28.17 - balanced macOS Safari selector PDF layout

- Keeps the Safari-only pagination repair after every legacy print rule, so it takes precedence reliably.
- macOS Safari now uses equal visible 8 mm margins at the top, bottom, left, and right.
- Windows and non-macOS browser output remains the V4.28.21 layout.

## V4.28.16 - macOS Safari-only PDF pagination

- Restores the exact V4.28.21 print CSS and layout for Windows and non-macOS browsers.
- Applies the V4.28.15 blank-page prevention only when the browser is Safari on macOS.
- Keeps the macOS Safari PDF as Curve, Technical Data, and Dimension on three pages.

## V4.28.15 - Safari/macOS PDF blank-page repair

- Fixes Safari/macOS selector PDFs that insert a blank page after each intended page.
- Each report page uses a zero-margin A4 print context and a 296 mm high page box, leaving a 1 mm Safari rounding buffer before the explicit page break.
- The existing 8 mm inset and the visible Curve, Technical Data, and Dimension layouts are preserved.
- Applied to CHC C4/C6, BFI and ES selector PDF paths, including CHC/BFI Product reports.
- No hydraulic logic, data, KeyBot function, or database migration changed.




## V4.28.21 - Global System Curve +5% display cap

- System Curve display now stops at **105% of the design/system-point head** instead of extending far above the selected operating point.
- Example: a 100 m system point draws to 105 m; the verified 103 m ES example draws to 108.15 m.
- Applied to CHC C4/C6, BFI and ES in KeySuite screen/PDF, plus KeyBot ES motor-limited PDF curves.
- Hydraulic calculations and operating-point intersections are unchanged; this is a display-length rule only.
- V4.28.12 ES natural endpoint fix, global Power 5th-order fitting and PDF curve-line widths remain unchanged.
- No database migration is required. Redeploy `telegram-webhook` for the KeyBot PDF change.

## V4.28.12 - KeyBot ES PDF natural curve endpoint fix

- Fixes the remaining KeyBot ES PDF issue where Head, Efficiency, Power and NPSH could fall vertically to zero at the final flow point.
- Root cause: the final sampled x could be microscopically greater than the polynomial fit maximum because of floating-point arithmetic. `ESCore.polyEval(..., false)` then returned `null`, and the previous generic finite check converted `null` to numeric zero.
- The ES PDF sampler now pins the first and last points exactly to `fit.min` and `fit.max` and rejects `null` / `undefined` results rather than coercing them to zero.
- The selected-impeller label therefore follows the real final Head point instead of being drawn near the x-axis.
- Regression example: `ES 80-32H / 100 HP / 2P / 500 IGPM`, selected impeller Ø280 mm, now ends naturally near 231.88 m³/hr at approximately 84.08 m Head, 66.83% efficiency, 106.81 HP and 10.07 m NPSH.
- V4.28.10/V4.28.11 originally used global Power = 5th order; V4.28.57 supersedes only that Power order with third order while preserving the curve-line widths and `500 IGPM (136.4 m³/hr) @ 103 mtr` duty display.
- No database migration is required.


## V4.28.11 - CHC/BFI screen curve visibility regression fix

- Fixes the V4.28.10 regression where CHC C4/C6 and BFI on-screen curves could render with zero stroke width after Quick Selection/Product selection.
- `curveWidth = null` now correctly uses the normal existing screen thickness; only an explicit positive width overrides it.
- Applied to both Selector and Product/Quick Selection curve renderers.
- KeySuite PDF curve width remains 1.8 SVG units.
- KeyBot PDF remains 1.35 pt (~1.8 px).
- Global Power curve remains 5th order.
- No database migration is required.

## V4.28.10 - Global Power 5th-order + PDF curve standardisation + ES endpoint correction

- Standardises the **Power curve to 5th-order polynomial** across CHC C4, CHC C6, BFI and ES for both KeySuite and KeyBot.
- Bypasses the older display-only cubic Power smoother so the visible Power line follows the 5th-order polynomial directly.
- KeySuite **PDF only**: all plotted pump/system/orifice/parallel/variable curve lines use **1.8 SVG units**. On-screen curve thickness remains unchanged.
- KeyBot PDF: all plotted curve lines use **1.35 pt**, approximately the visual equivalent of 1.8 px at 96 dpi.
- ES motor-trimmed curves stop at the last valid hydraulic point instead of adding a false trailing zero point; Head, Efficiency, Power and NPSH no longer drop vertically to zero at the high-flow end.
- ES exact model + motor + flow-only requests preserve the original flow unit and show the m³/hr conversion. Derived head is rounded to the nearest whole metre for display only.
- Example: `500 IGPM` is displayed as **500 IGPM (136.4 m³/hr) @ 103 mtr** when the calculated head is approximately 102.9 m. Internal calculations retain the unrounded values.
- Motor-safe impeller selection, safety-factor logic, BEP motor-only behavior and flow/head constrained operating-point logic are otherwise unchanged.

## V4.28.09 - ES suffix + assigned-brand routing correction

- Exact ES Fast Search now recognises one-letter hydraulic model suffixes, including `ES 80-32H` and `ES 80-32G`.
- `HP`, `kW`, `2P`, `4P`, `2Pole`, `4Pole`, `cw` and `c/w` technical tokens are removed before Customer-name inference.
- Unbranded exact ES searches no longer default to B.G.Reich when several assigned brands match. KeyBot shows the matching **Brand / Model** choices first.
- If only one assigned brand matches the exact ES model and pole, KeyBot continues automatically.
- Explicit Brand + ES Model remains strictly scoped to that assigned brand.
- Preserves V4.28.08 motor-safe impeller trimming, complete selected-impeller curve, BEP default rated point, and flow-only/head-only behavior.



## V4.28.08 - ES motor trim + BEP rated point correction

- ES exact model + motor HP now **trims impeller diameter first** until the largest diameter that satisfies the existing KeySuite motor safety-factor rule is found.
- The selected impeller's **full hydraulic curve** is retained; motor HP no longer truncates the curve at an arbitrary end point.
- With motor HP only, the rated point is the **BEP of the selected trimmed impeller**, and the system curve is drawn through that BEP.
- With flow-only or head-only input, the user-specified coordinate remains the operating constraint and the system curve passes through the derived operating point.
- If the motor is insufficient even at minimum impeller size, KeyBot reports that explicitly.
- Fast Search protects HP/kW/pole/cw technical continuation lines from Customer parsing.
- Unbranded exact ES + motor HP requests prefer assigned **B.G.Reich**.


## V4.28.07 - KeyBot hydraulic selection + exact-model curve control

- Adds a **5% head undersize allowance** when no fully suitable model remains in the requested scope. The candidate stays selectable and is explicitly marked **(Undersized)**.
- Adds nominal series filtering: `CHC 15` searches CHC 15-xx only; `ES 65` searches ES 65-xx only.
- Exact CHC / ES model + duty now keeps the selected model, generates its curve, plots the requested duty even outside the curve range, and shows an out-of-curve warning instead of substituting another model.
- ES exact model + motor HP can generate a motor-limited curve using the existing KeySuite ES safety-factor motor sizing rules.
- ES exact model + motor HP + flow-only selects the largest allowable impeller and plots the maximum head available at that flow.
- ES exact model + motor HP + head-only resolves the maximum usable flow at that head.
- Preserves the V4.28.06 TESK Chemical Pump / dosing / exact GS selection changes below.

## V4.28.06 - Chemical template + exact GS selection

- Typing `chem` or `chemical` opens a copy-and-fill template:
  - Medium
  - Concentration
  - Flow
  - Pressure
  - Temperature
- The same template can also be started with common dosing/metering aliases.
- Temperature parsing accepts `70C`, `70°C`, `70 deg C`, `70 degree C` and similar forms.
- `Hydrochloric Acid`, `HCl` and `Muriatic acid` normalize to the same chemical family.
- Flow + pressure are the only hard requirements for hydraulic sizing. Missing medium, concentration or temperature no longer blocks a preliminary pump recommendation.
- When chemical information is incomplete, KeyBot shows the available TESK catalogue material/concentration/temperature reference instead of simply stopping.
- Added exact GS hydraulic points GS001-GS060. Example: `30 L/hr @ 5 bar` selects `GS030` (30 L/hr, 7 bar catalogue point).
- For 30% HCl above the conservative complete-seal limit, PVDF/fluoroplastic can remain a preliminary pump-head recommendation where supported by the catalogue, while final seal/O-ring confirmation remains required.
- Preserves all V4.28.05 routing fixes: direct chemical technical sizing, TESK clean-water family isolation, and no TESK-to-B.G.Reich ES fallback.

TESK Chemical Pump / Metering Selection:
- Key > Customer includes a customer-specific **TESK Chemical Pump** assignment.
- **Chemical / Material Selection** can be enabled separately for each Customer.
- KeyBot directly recognizes `TESK Chemical Pump`, while retaining `TESK Metering Pump` and `Dosing Pump` as aliases.
- The guided Product menu shows **TESK · Chemical Pump** only when it is permitted and assigned to the selected Customer.
- KeyBot routes normal water/transfer pump duties separately from dosing/metering duties.
- Chemical dosing asks for medium, concentration, temperature, flow in L/hr and pressure in bar.
- Material recommendations use conservative rules digitized from the TESK metering-pump catalogue; conditions outside those rules are marked **Engineering Review Required** instead of guessed.
- Exact CKS hydraulic points are used when the duty is covered.
- Exact GS hydraulic points are used for GS001-GS060; larger duties outside digitized exact points return a TESK series candidate and require model confirmation against the catalogue flow/pressure table.
- Customer assignment is stored inside the existing V4.17.10 generic preference JSON.

BFI Product Curve phase synchronization:
- Product > BFI > Curve now changes a 3-phase `T` model to the base model immediately when 1-phase is selected.
- Example: `BFI 2-3T` becomes `BFI 2-3`; changing back to 3-phase restores `BFI 2-3T`.
- The same rule applies to SS316 models: `BFIN 2-3T` becomes `BFIN 2-3`.

KeyBot routing restoration:
- Brand, series, model and duty searches take priority over the legacy Customer-search fallback.
- `CHC`, `BFI`, `ES`, `VMS` and `HMS` entered alone start a scoped pump search.
- Brand-first two-line input such as `OK` followed by `VMS 32-4` is recognized as an O.K.Pump model request.
- Brand or series can be followed by either an exact model or a duty point.
- `ES 2P` and `ES 4P` retain the selected pole when the duty is entered next.

TESK KeyBot selection corrections:
- Direct chemical dosing requests perform technical sizing before any Customer selection.
- The pump recommendation is shown before chemical material details.
- Missing temperature no longer blocks hydraulic sizing and is not treated as 0°C; it remains required for final wetted-parts confirmation.
- Normal clean-water TESK requests use only active TESK OEM family mappings.
- TESK cannot fall back to or display B.G.Reich ES models.
- Brand Series labels without an active OEM Family Map cannot create a searchable hydraulic family.

Deployment:
1. Upload/deploy the V4.28.21 web files to GitHub.
2. Redeploy Supabase Edge Function `telegram-webhook`.
3. No new database migration is required.
4. Refresh KeySuite after deployment.
