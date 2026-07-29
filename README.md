# KeySuite V1.00 — Secure Login GitHub Package

This is the **public website package**. It contains the login page and application code only.

## Security design

- Login is the first page.
- Email/password authentication uses Supabase Auth.
- There is no public sign-up button.
- An approved-email allowlist controls who can enter.
- PostgreSQL Row Level Security controls database reads.
- Company, user and pricing master data are **not included** in this GitHub package.
- Quotation drafts are stored separately in the browser for each signed-in email.

## Before uploading to GitHub

1. Run the private SQL file `keysuite-v1.00-secure-supabase.sql` in Supabase SQL Editor.
2. In Supabase Authentication, manually create the approved user accounts.
3. Disable public email sign-ups in Supabase Authentication settings.
4. Open `config.js` and paste:
   - Supabase Project URL
   - Supabase publishable key or legacy anon key
5. Upload only the contents of this public folder to GitHub Pages.

## Important

- Never put the Supabase `service_role` key, secret key, database password, source Excel files or private SQL seed file into GitHub.
- The browser key is not the security boundary. Row Level Security is.
- Changing only the HTML login screen without RLS would not protect the price list.
