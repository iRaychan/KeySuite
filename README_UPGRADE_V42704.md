# Upgrade to KeySuite V4.27.04

Apply over V4.27.03.

BFI material options:
- **Stainless Steel 304** keeps the **BFI** model prefix.
- **Stainless Steel 316** changes the displayed, quoted and PDF model prefix to **BFIN**.
- KeyBot applies the same BFI/BFIN material identity while retaining the original BFI hydraulic and price-list record.

Quick Selection Cold Item control:
- A **Cold Item** checkbox is shown beside **Check Pumps**.
- Leave it unticked to prioritize models with a filled price and suppress unpriced alternatives when a priced model is suitable.
- Tick it to include suitable unpriced CHC C4/C6, BFI and ES models.
- Unpriced results are clearly labelled **Cold Item**.

KeyBot Cold Item flow:
- The first sizing result shows priced recommended and alternative models.
- A **Cold Item** button is placed after the model choices when suitable unpriced models exist.
- Pressing it opens the retained unpriced-model list without recalculating the duty.
- **Regular Item** returns to the priced-model list.
- Cold Item status is retained through model selection and curve generation.

Deployment:
1. Upload the V4.27.04 upgrade files to the KeySuite web host/GitHub.
2. Open PowerShell in the upgraded KeySuite folder.
3. Link the active Supabase project:

   `supabase link --project-ref skidqdixnnnuhvarekxp`

4. Deploy KeyBot:

   `supabase functions deploy telegram-webhook`

5. Refresh KeySuite after GitHub Pages finishes deploying.

No Supabase database migration or `supabase db push` is required.
