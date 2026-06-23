LavishAI Tree Manager - Phone + Computer Cloud Sync Version

This version can still run locally, but it is ready for Supabase cloud sync.

Files added:
- supabase-config.js
- SUPABASE-SETUP.sql

Setup:
1. Go to supabase.com and create a free project.
2. Open SQL Editor in Supabase.
3. Paste and run the contents of SUPABASE-SETUP.sql.
4. Open Project Settings > API.
5. Copy your Project URL and anon public key.
6. Open supabase-config.js.
7. Set enabled: true.
8. Paste your URL and anon key.
9. Upload this folder to a web host like Netlify, Vercel, or GitHub Pages.
10. Open the hosted link on phone/computer and login.

Default owner logins:
Casey.royal / Temp1234
Lucas.harrold / Temp1234

Important:
The current cloud setup syncs the app data across devices, but the passwords are still basic app passwords.
For a fully secure production system, the next step is Supabase Auth with individual user accounts.
