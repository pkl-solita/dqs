# DQS PWA

A simple, local-first Progressive Web App for tracking daily Diet Quality Score (DQS).

The app is designed for quick daily use:

- Tap food-type tiles to log servings
- See live DQS updates with diminishing-return point logic
- Review the past 30 days in the History tab with bars plus trend line
- Keep all data local in your browser (no backend)

## Notes

- This app was vibe coded.
- Data is stored locally only (IndexedDB).

## Attribution

The Diet Quality Score (DQS) system is attributed to Mark Fitzgerald, author of The Endurance Diet.

## Run Locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Quality Checks

```bash
npm run lint
npm run test:run
npm run build
```

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

Deploy flow:

1. Push to the `main` branch
2. GitHub Actions builds and deploys `dist/` to Pages

One-time GitHub setup:

1. Go to repository Settings -> Pages
2. Under Build and deployment, set Source to GitHub Actions

After deployment, your site URL will be shown in the workflow run summary.
