# KeySuite V1.03 — Secure Customers, User Settings and Golden Key

This release keeps the V1.02 quotation output frozen except for the approved change that moves **Prepared By** to the **Authorized Signature** area.

## Before uploading the website

Run this file once in **Supabase → SQL Editor**:

`setup/V103_SUPABASE_MIGRATION.sql`

It creates the secure customer table and access rules:

- Owner/Admin: all customers under the company
- User: only customers assigned to or created by that user
- No anonymous customer access

## Upload to GitHub Pages

Upload all files and folders in this package to the repository root and allow matching files to be replaced.

**Keep the working root `config.js` already present in GitHub.** This package intentionally does not include your real `config.js` or publishable key.

## V1.03 functions

- Secure login and sign out
- User Settings above Sign Out
- Display Name, Designation and Contact Number saved in Supabase Auth
- Password change with current-password verification
- New quotation Prepared By uses the logged-in user's saved Display Name
- Prepared By appears only in the Authorized Signature area
- Secure customer add/edit, classification and assigned user
- Role-based customer visibility
- Golden Key button: gold background, white key icon, opens the priced quotation workflow
- Dashboard, CHC selector, Company & Pricing, quotation, history and frozen print output
