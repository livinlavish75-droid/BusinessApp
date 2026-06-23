PERMANENT DATABASE UPDATE

1. Open Supabase.
2. Go to SQL Editor.
3. Open SUPABASE-PERMANENT-SCHEMA.sql from this folder.
4. Paste it into Supabase and click Run.
5. Upload these updated app files to GitHub Pages.

This version stores business data in permanent tables:
- app_users
- customers
- jobs
- estimates
- equipment
- time_off_requests
- business_settings
- activity_log

Future app updates can replace the app files without deleting the business data.
Do not delete or recreate these tables unless you intentionally want to reset the business database.

IMPORTANT:
The current version uses your app's existing login system and starter public Supabase policies.
For stronger production security later, upgrade to Supabase Auth + row-level owner/employee policies.
