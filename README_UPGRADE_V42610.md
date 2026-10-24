# Upgrade to KeySuite V4.26.10

Apply over V4.26.09.

KeySuite PDF and KeyBot changes:
- Enhanced PDF page 2 shows `Max 3500 rpm` for both Pump Speed and Motor Speed. Frequency remains separate.
- Standard Pump Speed uses hydraulic curve rpm; Motor Speed uses motor-master rpm.
- `OK`, `O.K.`, `OKPump`, `OK Pump`, and `O.K.Pump` resolve to the configured O.K.Pump brand. Standalone `OK` asks for Flow @ Head.
- `VMS` is treated as the pump type while the assigned selling-series name remains visible.
- `MOS` plus `VMS 20-4` resolves to `M.O.S - MVC 20-4`, with Type `VMS Pump`.
- `HMS` searches BFI and exact input such as `HMS 20-3` resolves to `BFI 20-3`, with Type `HMS Pump`.
- PDF type labels use VMS Pump for CHC/MVC, SVM Pump for TESK, and HMS Pump for BFI.

No `db push` is required.

Deployment order:
1. Upload the V4.26.10 upgrade files to the KeySuite web host/GitHub.
2. Run `npx.cmd supabase@latest functions deploy telegram-webhook --project-ref skidqdixnnnuhvarekxp --no-verify-jwt`.
