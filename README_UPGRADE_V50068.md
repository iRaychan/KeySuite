# KeySuite V5.00.68 UPGRADE

Baseline: KeySuite V5.00.67 FULL (SHA-256 de11f5b013e2096b90f256a3ec1a4c4205b8374b0a0617dbb129f44fdf3ecd6f).

1. Back up your current site and database.
2. Apply supabase/migrations/20261115150000_v50068_kv_g_series.sql in a controlled deployment.
   This package has not executed it against live Supabase. It adds 44 KV catalogue rows
   without changing existing prices, creates 12 separate G M/T price rows, and adds a G category rule.
3. Copy the update files over the corresponding V5.00.67 files, preserving paths.
4. Set G source prices and G category rules as Owner before automatic G quotations.
   The source workbook contains zero prices in both M and T columns; manual quotation
   pricing remains available through the existing workflow.

The supplied motor workbook has technical IE1 2 Pole motor information, but no motor
price column. G32-10-2 is the only base model with a supplied hydraulic curve.
The G workbook Pg 2 operating point and efficiency are an example for G32-10-2;
other models have no supplied duty point or efficiency.

Verification: static JavaScript syntax, catalogue and curve validation, quotation
handoff simulation, three-page PDF data mapping simulation, navigation and migration
checks. Live Supabase migration, authenticated browser interaction, final PDF visual
rendering and deployment were not performed.
