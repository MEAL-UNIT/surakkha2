# SURAKKHA Backend Setup — Real Accounts, Real Database

This turns the site from a static site with a fake login into a real system:
real accounts, real passwords, a real admin panel, and a real database for
the dashboard and certificates. It uses **Supabase** (a free, hosted
Postgres database with built-in authentication) — no server for you to run
or maintain.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is enough).
2. Click **New Project**. Pick any name and a database password (save it somewhere).
3. Wait ~2 minutes for it to finish setting up.

## 2. Run the database schema

1. In your new project, go to **SQL Editor** (left sidebar) → **New Query**.
2. Open `supabase-schema.sql` from this package, copy all of it, paste it in, and click **Run**.
3. This creates three tables — `profiles`, `dashboard_activities`, `certificates` —
   and the security rules that control who can see and edit what.

## 3. Turn off email confirmation

Since this is an internal staff tool, you want accounts usable right after
registering, not stuck waiting on a confirmation email.

1. Go to **Authentication → Providers → Email**.
2. Turn **off** "Confirm email".
3. Save.

## 4. Connect the site to your project

1. In Supabase, go to **Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `supabase-client.js` in this package and paste them in:

```js
const SUPABASE_URL = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY = 'your-long-anon-key-here';
```

4. Upload the updated `supabase-client.js` to your site along with everything else.

## 5. Make yourself the first admin

1. Go to `your-site.com/register.html` and register your own account normally.
2. Back in Supabase, go to **SQL Editor** and run (with your real email):

```sql
update profiles set role = 'admin', status = 'approved'
where email = 'your-email@example.com';
```

3. Log back in on the site — you'll now see an **Admin panel** link when you
   click your name in the top-right.

## What's now real

- **Registration** (`register.html`) creates a genuine account with a
  password — not just an email to MEAL.
- **Login** checks real credentials against the database, not a hardcoded
  list in a JS file.
- **Admin panel** (`admin.html`) — approve or reject registrations, promote
  someone to admin, add/view Dashboard activities, and see every certificate
  ever issued. All of this was previously either fake or manual.
- **Dashboard** reads live from the database for logged-in approved users
  (and still falls back to the CSV for anyone not logged in, so the page
  never breaks).
- **Certificates** are recorded in the database the moment someone passes an
  exam, visible to admins — not just a PDF that only the person who
  generated it has.

## What stays the same

Everything not mentioned above — the templates, the reporting cabinet, the
weather widget, incident reporting — is unchanged and still works exactly
as before, with or without the backend connected.

## Security note

The `anon` key is meant to be public — it's safe to have it visible in your
site's JavaScript. What actually protects your data are the Row Level
Security policies in `supabase-schema.sql`, which run on Supabase's servers
and decide what each request is allowed to do, regardless of what the
browser asks for. This is real, server-enforced security — unlike the
previous JS-only gate, it can't be bypassed by viewing page source or
disabling JavaScript.
