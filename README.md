# Deadline

A calm, minimalist personal countdown timer for the deadlines that matter.

**Live app:** [ryvnaquino.github.io/deadline_timer](https://ryvnaquino.github.io/deadline_timer/)

## Features

- Create multiple deadlines with a title and target date/time
- See live days, hours, minutes, and seconds remaining
- Edit or delete existing deadlines
- Clear expired-deadline states
- Responsive layout for desktop and mobile
- Automatic local persistence with `localStorage`

## Use the app

Open the [live app](https://ryvnaquino.github.io/deadline_timer/) and select **Add deadline**. Deadlines are saved locally in the browser you use, so they remain available on that device and browser without an account.

Because the data is stored locally, deadlines are not synced between browsers or devices. Clearing the browser's site data will remove saved deadlines.

## Run locally

This is a dependency-free static app. Clone the repository and open `index.html` in a browser, or serve the directory with any static file server:

```bash
git clone https://github.com/ryvnaquino/deadline_timer.git
cd deadline_timer
python3 -m http.server
```

Then visit <http://localhost:8000>.

## Deployment

The app is deployed with GitHub Pages through [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). Pushes to `main` or the deployment branch trigger a new deployment.
