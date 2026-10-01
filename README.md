# Deadline

A minimalist countdown app with accounts and cloud-synced deadlines. Signed-in users can access the same private deadline list from different devices.

**Live app:** [ryvnaquino.github.io/deadline_timer](https://ryvnaquino.github.io/deadline_timer/)

## Stack

- Frontend: HTML, CSS, and browser JavaScript
- Auth, API, and database: Supabase Auth and Postgres
- Database authorization: Postgres row-level security

## Configure the backend

The app can still run in local-only mode. To enable accounts and cloud sync:

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. In **Authentication → URL Configuration**, add the app origin to the allowed redirect URLs. For this GitHub Pages site, add `https://ryvnaquino.github.io/**`; for local development, add `http://localhost:8000/**`.
4. In **Project Settings → API**, copy the Project URL and the publishable/anon key. These browser values are designed to be public; never put a `service_role` or secret key in frontend code.
5. Put those values in [`backend-config.js`](backend-config.js):

   ```js
   window.DEADLINE_CONFIG = {
     supabaseUrl: "https://YOUR-PROJECT.supabase.co",
     supabaseAnonKey: "YOUR-PUBLISHABLE-OR-ANON-KEY",
   };
   ```

6. Deploy the updated site and use **Sign in to sync** to create an account or sign in.

The SQL enables row-level security and grants users access only to their own rows. Existing local deadlines are imported into the signed-in account on first sync. Signing out returns to the deadlines saved locally in that browser.

Until valid Supabase values are added, account controls show that cloud setup is needed and deadlines continue to use local storage. The hosted app does not become cloud-backed until a Supabase project is configured.

## Run locally

Serve the files over HTTP (opening `index.html` directly can prevent auth redirect URLs from working):

```bash
git clone https://github.com/ryvnaquino/deadline_timer.git
cd deadline_timer
python3 -m http.server
```

Then visit <http://localhost:8000>.

## Deployment

The static frontend is deployed to GitHub Pages through [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). Supabase is a separately configured hosted backend, so adding credentials to `backend-config.js` and redeploying is required to activate cloud sync.

## Vercel Analytics

The page includes Vercel's Web Analytics client. To collect visits and page views, enable **Web Analytics** under **Analytics** in the Vercel project. Analytics collect only when the site is served by Vercel.
