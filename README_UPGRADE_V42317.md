# KeySuite V4.23.17 Upgrade

## Product / Selector action navigation
- CHC C4, CHC C6 and BFI Product + Selection/Selector **Assembly** actions now navigate to the System builder after the existing add/pricing action completes.
- CHC C4, CHC C6 and BFI Product + Selection/Selector **Quote** actions now navigate to Quotation after the existing add/pricing action completes.
- The patch covers both parent Product action buttons and same-origin Product selector iframe action buttons, including selector iframe reloads caused by Standard/Enhanced switching.

No Supabase database migration or Telegram/KeyBot function deployment is required for V4.23.17.
