# Workout Tracker

A personal, offline-first workout tracker for iPhone. Plain HTML, CSS and JavaScript with no build step and no dependencies.

## Files

| Path | What it does |
| --- | --- |
| `index.html` | App shell and bottom tabs |
| `css/styles.css` | Design tokens (palette as CSS variables) and all styles |
| `js/storage.js` | localStorage, schema version, migrations, backup export/import |
| `js/data.js` | Data model, store, calculations (volume, 1RM, PRs, weekly muscles) |
| `js/diagram.js` | Front and back SVG muscle diagram |
| `js/charts.js` | Small canvas line chart |
| `js/ui.js` | Toast, bottom sheet, exercise picker, rest timer |
| `js/screens/*.js` | Today, Plan, Library, Progress, Settings |
| `js/app.js` | Router and event wiring |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA: offline use and Home Screen icon |

## Run locally

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123.

## Host it for free

**GitHub Pages**
1. Create a new public repository on github.com, for example `workouts`.
2. Upload every file and folder in this project, keeping the folder structure.
3. In the repository, go to Settings → Pages. Under "Build and deployment", choose "Deploy from a branch", pick `main` and `/ (root)`, then Save.
4. After a minute your app is live at `https://<your-username>.github.io/workouts/`.

**Netlify (drag and drop)**
1. Go to app.netlify.com/drop and sign in.
2. Drag this whole project folder onto the page.
3. Netlify gives you a URL like `https://something.netlify.app`. You can rename it in Site settings.

## Add it to your iPhone Home Screen

1. Open the app's URL in **Safari** on your iPhone.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open it from the new icon. It runs full screen and works offline.

## Updating

When you change any file, bump `CACHE` in `sw.js` (for example `workout-tracker-v2`). Then open the app twice on the phone to pick up the new version.

## Your data

Everything is stored on the phone in the browser's localStorage. Nothing is sent anywhere. Use **Settings → Export backup** now and then and save the file to Files or iCloud Drive. **Import backup** restores it, on the same phone or a new one.

Note: data saved in the Home Screen app is separate from data in a regular Safari tab, so always log from the Home Screen icon.
