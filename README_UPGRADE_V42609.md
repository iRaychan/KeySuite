# Upgrade to KeySuite V4.26.09

Apply over V4.26.08.

KeyBot and curve changes:
- Exact BFI model plus duty input preserves the exact model, resolves motor phase when required, and plots the entered duty point on the generated curve.
- Bare Flow @ Head searches every curve-enabled Brand / Series assigned to the KeySuite user.
- Broad no-brand results exclude models without an input price, keep Common price-list entries, and retain the closest suitable model per Brand / Series.
- `MOS`, `Mos`, and `M.O.S` resolve to the configured M.O.S brand; `OK`, `OK Pump`, and `O.K.Pump` resolve to O.K.Pump.
- PDF page 2 displays VMS Pump for OEM CHC-family products and SVM Pump for TESK.
- Pump Speed uses hydraulic-data rpm; Motor Speed uses motor-master rpm. Frequency remains separate and Hz is not repeated in either speed field.

No `db push` is required.

Deployment order:
1. Upload the V4.26.09 upgrade files to the KeySuite web host/GitHub.
2. Run `npx.cmd supabase@latest functions deploy telegram-webhook --project-ref skidqdixnnnuhvarekxp --no-verify-jwt`.
