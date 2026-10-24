# KeySuite V4.29.10 Upgrade

## Changes

- Key → Company & Pricing now shows **Customer** for the total customer count and **Assigned Category** for the number of customers with a valid Pricing Category assignment. It no longer displays the total number of category definitions.
- Customers without an assigned Pricing Category are highlighted in red in the customer dropdown and marked **⚠ Not assigned**. Selecting one keeps the customer field in the alert state until a category is saved.
- Company & Pricing now shows **Models** for distinct loaded product models across all families and **Models With Price** for models with at least one populated USD, RMB or MYR price. Each model is counted once even when several variants or currencies have prices.
- General Pricelist → Fuel Settings now includes owner-editable **Fuel Efficiency**, defaulting to 6.3 km/L, and **Return Journey** Yes/No.
- Fuel surcharge uses `(Distance × Journey Multiplier ÷ Fuel Efficiency) × max(Current Fuel Price − Base Fuel Price, 0)`, where the multiplier is 2 for Return Journey Yes and 1 for No.
- Rarity is model-variant data rather than currency data. Saving one currency applies its rarity to USD, RMB and MYR.
- Existing rarity conflicts are normalized by retaining a unanimous value. If values differ, only quoteable priced currencies participate and the priority is Fixed, Rare, Many, then Common. With no quoteable price, the safe default is Common.
- The Quotation page now retains a floating bottom-right Back button when opened from CHC, CR, BFI or ES Selection.
- Automatic quotation references now refresh from secure history even after Selection adds an item, preventing an incorrect reset to `0001`.
- Quotation prefixes no longer create separate running-number sequences. The four-digit number is company-wide and continues across every prefix for the calendar year. For example, after `R-2610-0230`, an `RC` user's October quotation is `RC-2610-0231`, and the next November quotation is `PREFIX-2611-0232`.
- The browser first uses loaded history and then confirms the preview against a secure company-wide Supabase function, so restricted History visibility cannot cause duplicate or restarted numbers.

## Counter semantics

- A model identity is `product family + model name`; the same name in separate families remains two real catalogue models.
- Materials, phases, pump quantities and currencies do not add extra model counts.
- In schemas that preserve blank as `NULL` (CHC C4/C6, GWS, ES, KeyPLC and Manifold), an entered zero is populated and counts.
- CR, BFI, Motor and Coupling import schemas use zero as the source's blank/unpriced sentinel, so those families require a value above zero for **Models With Price**.

## Deployment

1. Upload the V4.29.10 application files.
2. Run `supabase/migrations/20261018190000_v42910_company_wide_quotation_sequence.sql` once.
3. If upgrading from before V4.29.08, also run `supabase/migrations/20261018150000_v42906_fuel_and_model_rarity.sql` once and redeploy the included `telegram-webhook` edge function.

The V4.29.10 migration is repeat-safe. It reads the highest saved annual running number across all prefixes, maintains an RLS-protected company/year counter, and leaves each user's assigned prefix unchanged.
