# KeySuite V4.23.07 UPGRADE

Upgrade from V4.23.06.

Changes:
- CHC C6 Product Curve Enhanced control and exact-model Enhanced execution.
- BFI Product Curve Enhanced execution fixed.
- BFI naming/motor rule: 1Ph = base model + IE1; 3Ph = T suffix + IE2.
- Product exact-model automatic Head is floored to a whole metre; manual duty is not rounded.
- CHC C4/C6 and BFI auto-duty use the same Head-floor rule.

Deployment:
1. Overwrite the web files from this Upgrade folder.
2. No `supabase db push` is required.
3. Redeploy: `npx.cmd supabase functions deploy telegram-webhook`
4. Hard refresh KeySuite after GitHub Pages updates.
