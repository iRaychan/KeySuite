# Upgrade to KeySuite V4.26.03

Apply over V4.26.02.

Front-end curve-state patch only. No Supabase db push is required.

- Product Curve keeps the exact selected pump model/curve when Motor IE or Phase changes.
- D1 now has a clear/remove control. Clearing Flow or Head removes D1/system-duty markers while retaining the selected pump curve.
- D2-D6 individual remove controls remain unchanged.
- Applies to CHC C4/C6, VMS/SVM branded paths, and BFI/HMS.
