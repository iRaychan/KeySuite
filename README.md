# KeySuite V1.13

Secure KeySuite release based on V1.11 with the V1.08 PDF output fully frozen.

## V1.13 changes

- Gold **Key** opens a new Key Dashboard.
- The first Key module is **Role**.
- Owner/Admin can list approved users, add user access, assign roles and activate/deactivate accounts.
- Available roles: Owner, Admin, User, Dealer and Viewer.
- Admin cannot assign or modify an Owner.
- The final active Owner cannot be removed or disabled.
- Role changes are recorded in an audit history.
- The Role page shows whether a matching Supabase Authentication login exists.
- **Refresh Data** was removed from Company & Pricing.
- Customer ID and Category ID remain hidden from user-facing dashboards.
- No PDF/print layout was changed.

## Installation

1. Keep the existing working `config.js` in the GitHub repository.
2. Run `setup/V112_SUPABASE_MIGRATION.sql` in Supabase SQL Editor.
3. Upload all V1.13 public files to the repository root, replacing matching files.
4. Refresh the deployed page using `Ctrl + Shift + R`.

## Adding a new user

The Role module approves the email and assigns its KeySuite role. A matching login must also be created under **Supabase → Authentication → Users** before that person can sign in.
